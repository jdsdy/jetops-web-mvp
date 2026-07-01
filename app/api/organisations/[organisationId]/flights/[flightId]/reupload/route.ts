import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { withApiLogging } from "@/lib/api-logging";
import { getJetOpsApiKey, getJetOpsApiUrl } from "@/lib/env";
import {
  FLIGHT_PLAN_BUCKET,
  buildFlightPlanStoragePath,
  sanitizeFlightPlanFilename,
  validateReuploadFlightPlanFormData,
} from "@/lib/flights";
import { requireActiveOrganisationMember } from "@/lib/fleet";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ReuploadedFlightPlanResources = {
  previousCurrentPlanId: string | null;
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
 * Removes a partially reuploaded flight plan after a failure.
 */
async function rollbackReuploadedFlightPlan(
  adminClient: SupabaseClient,
  resources: ReuploadedFlightPlanResources,
) {
  if (resources.storagePath) {
    await adminClient.storage
      .from(FLIGHT_PLAN_BUCKET)
      .remove([resources.storagePath]);
  }

  if (resources.flightPlanId) {
    await adminClient.from("flight_plans").delete().eq("id", resources.flightPlanId);
  }

  if (resources.previousCurrentPlanId) {
    await adminClient
      .from("flight_plans")
      .update({ is_current: true })
      .eq("id", resources.previousCurrentPlanId);
  }
}

/**
 * Rolls back partial reupload writes and returns an error response.
 */
async function failAfterReuploadRollback(
  adminClient: SupabaseClient,
  resources: ReuploadedFlightPlanResources,
  message: string,
  status: number,
) {
  await rollbackReuploadedFlightPlan(adminClient, resources);
  return jsonError(message, status);
}

/**
 * Replaces the current flight plan PDF and triggers a new extraction job.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ organisationId: string; flightId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId, flightId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    logContext.set({ userId: user.id });

    const { membership, error: memberError } = await requireActiveOrganisationMember(
      supabase,
      user.id,
      organisationId,
    );

    if (memberError || !membership) {
      return jsonError("Forbidden", 403);
    }

    logContext.set({ organisationId: membership.organisations.id });

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const validation = validateReuploadFlightPlanFormData(formData);

    if (!validation.valid) {
      return jsonError(validation.error, 400);
    }

    const adminClient = createAdminClient();
    const resolvedOrganisationId = membership.organisations.id;

    const { data: flight, error: flightError } = await adminClient
      .from("flights")
      .select("id")
      .eq("id", flightId)
      .eq("organisation_id", resolvedOrganisationId)
      .maybeSingle();

    if (flightError || !flight) {
      return jsonError("Flight not found", 404);
    }

    const { data: previousCurrentPlan, error: previousPlanError } = await adminClient
      .from("flight_plans")
      .select("id")
      .eq("flight_id", flightId)
      .eq("is_current", true)
      .maybeSingle();

    if (previousPlanError) {
      return jsonError(previousPlanError.message, 500);
    }

    const createdResources: ReuploadedFlightPlanResources = {
      previousCurrentPlanId: previousCurrentPlan?.id ?? null,
      flightPlanId: null,
      storagePath: null,
    };

    const { data: newPlanId, error: rpcError } = await adminClient.rpc(
      "set_current_flight_plan",
      {
        p_flight_id: flightId,
        p_storage_path: "",
        p_uploaded_by: user.id,
      },
    );

    if (rpcError || !newPlanId) {
      return jsonError(rpcError?.message ?? "Failed to create flight plan", 500);
    }

    createdResources.flightPlanId = String(newPlanId);

    const filename = sanitizeFlightPlanFilename(validation.payload.flight_plan.name);
    const storagePath = buildFlightPlanStoragePath(
      resolvedOrganisationId,
      flightId,
      createdResources.flightPlanId,
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
      return failAfterReuploadRollback(
        adminClient,
        createdResources,
        uploadError.message,
        500,
      );
    }

    createdResources.storagePath = storagePath;

    const { error: storagePathError } = await adminClient
      .from("flight_plans")
      .update({ storage_path: storagePath })
      .eq("id", createdResources.flightPlanId);

    if (storagePathError) {
      return failAfterReuploadRollback(
        adminClient,
        createdResources,
        storagePathError.message,
        500,
      );
    }

    const jetOpsApiKey = getJetOpsApiKey();

    if (!jetOpsApiKey) {
      return failAfterReuploadRollback(
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
      return failAfterReuploadRollback(
        adminClient,
        createdResources,
        "Authenticated session is required",
        401,
      );
    }

    let externalResponse: Response;

    try {
      externalResponse = await fetch(`${getJetOpsApiUrl()}/jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-API-KEY": jetOpsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organisation_id: resolvedOrganisationId,
          flight_id: flightId,
          flight_plan_id: createdResources.flightPlanId,
          storage_path: storagePath,
        }),
      });
    } catch {
      return failAfterReuploadRollback(
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

      return failAfterReuploadRollback(adminClient, createdResources, message, 502);
    }

    return Response.json(
      {
        flight_id: flightId,
        flight_plan_id: createdResources.flightPlanId,
        job_id: externalBody.id,
      },
      { status: 201 },
    );
  });
}
