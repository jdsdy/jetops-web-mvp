import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { withApiLogging } from "@/lib/api-logging";
import { getJetOpsApiKey, getJetOpsApiUrl } from "@/lib/env";
import {
  FLIGHT_PLAN_BUCKET,
  buildFlightPlanStoragePath,
  buildJetOpsJobCreateBody,
  sanitizeFlightPlanFilename,
  validateCreatePersonalFlightFormData,
} from "@/lib/flights";
import { requirePersonalAccount } from "@/lib/personal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CreatedFlightResources = {
  flightId: string | null;
  flightPlanId: string | null;
  storagePath: string | null;
};

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Verifies the aircraft belongs to the personal account owner.
 */
async function verifyPersonalAircraft(
  adminClient: SupabaseClient,
  userId: string,
  aircraftId: string,
): Promise<boolean> {
  const { data, error } = await adminClient
    .from("fleet_aircraft")
    .select("id")
    .eq("id", aircraftId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

/**
 * Removes partially created flight resources after a failure.
 */
async function rollbackCreatedFlightResources(
  adminClient: SupabaseClient,
  resources: CreatedFlightResources,
) {
  if (resources.storagePath) {
    await adminClient.storage
      .from(FLIGHT_PLAN_BUCKET)
      .remove([resources.storagePath]);
  }

  if (resources.flightPlanId) {
    await adminClient.from("flight_plans").delete().eq("id", resources.flightPlanId);
  }

  if (resources.flightId) {
    await adminClient.from("flights").delete().eq("id", resources.flightId);
  }
}

/**
 * Rolls back partial writes and returns an error response.
 */
async function failAfterRollback(
  adminClient: SupabaseClient,
  resources: CreatedFlightResources,
  message: string,
  status: number,
) {
  await rollbackCreatedFlightResources(adminClient, resources);
  return jsonError(message, status);
}

/**
 * Creates a personal flight, uploads its plan PDF, and triggers external analysis.
 */
export async function POST(request: Request) {
  return withApiLogging(request, async (logContext) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    logContext.set({ userId: user.id });

    const { profile, error: accountError } = await requirePersonalAccount(
      supabase,
      user.id,
    );

    if (accountError || !profile) {
      return jsonError("Forbidden", 403);
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const validation = validateCreatePersonalFlightFormData(formData);

    if (!validation.valid) {
      return jsonError(validation.error, 400);
    }

    const adminClient = createAdminClient();
    const aircraftValid = await verifyPersonalAircraft(
      adminClient,
      user.id,
      validation.payload.aircraft_id,
    );

    if (!aircraftValid) {
      return jsonError("Aircraft not found in your fleet", 400);
    }

    const createdResources: CreatedFlightResources = {
      flightId: null,
      flightPlanId: null,
      storagePath: null,
    };

    const { data: createdFlight, error: flightError } = await adminClient
      .from("flights")
      .insert({
        user_id: user.id,
        organisation_id: null,
        pic_user_id: user.id,
        aircraft_id: validation.payload.aircraft_id,
        status: null,
      })
      .select("id")
      .single();

    if (flightError || !createdFlight) {
      return jsonError(flightError?.message ?? "Failed to create flight", 500);
    }

    createdResources.flightId = createdFlight.id;

    const { data: createdFlightPlan, error: flightPlanError } = await adminClient
      .from("flight_plans")
      .insert({
        flight_id: createdFlight.id,
        uploaded_by: user.id,
        is_current: true,
        source_app: null,
      })
      .select("id")
      .single();

    if (flightPlanError || !createdFlightPlan) {
      return failAfterRollback(
        adminClient,
        createdResources,
        flightPlanError?.message ?? "Failed to create flight plan",
        500,
      );
    }

    createdResources.flightPlanId = createdFlightPlan.id;

    const filename = sanitizeFlightPlanFilename(validation.payload.flight_plan.name);
    const storagePath = buildFlightPlanStoragePath(
      user.id,
      createdFlight.id,
      createdFlightPlan.id,
      filename,
    );
    const fileBuffer = Buffer.from(await validation.payload.flight_plan.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from(FLIGHT_PLAN_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return failAfterRollback(adminClient, createdResources, uploadError.message, 500);
    }

    createdResources.storagePath = storagePath;

    const { error: storagePathError } = await adminClient
      .from("flight_plans")
      .update({ storage_path: storagePath })
      .eq("id", createdFlightPlan.id);

    if (storagePathError) {
      return failAfterRollback(
        adminClient,
        createdResources,
        storagePathError.message,
        500,
      );
    }

    const jetOpsApiKey = getJetOpsApiKey();

    if (!jetOpsApiKey) {
      return failAfterRollback(
        adminClient,
        createdResources,
        "JetOps API key is not configured",
        500,
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return failAfterRollback(
        adminClient,
        createdResources,
        "Authenticated session is required",
        401,
      );
    }

    let externalResponse: Response;

    try {
      externalResponse = await fetch(`${getJetOpsApiUrl()}/v1/jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-API-KEY": jetOpsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildJetOpsJobCreateBody({
            user_id: user.id,
            flight_id: createdFlight.id,
            flight_plan_id: createdFlightPlan.id,
            storage_path: storagePath,
          }),
        ),
      });
    } catch {
      return failAfterRollback(
        adminClient,
        createdResources,
        "Failed to contact analysis service",
        502,
      );
    }

    const externalBody = (await externalResponse.json().catch(() => null)) as {
      id?: string;
    } | null;

    if (!externalResponse.ok || !externalBody?.id) {
      const message = externalResponse.ok
        ? "Analysis service did not return a job id"
        : "Analysis service rejected the job request";

      return failAfterRollback(adminClient, createdResources, message, 502);
    }

    return Response.json(
      {
        flight_id: createdFlight.id,
        flight_plan_id: createdFlightPlan.id,
        job_id: externalBody.id,
      },
      { status: 201 },
    );
  });
}
