import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  FLEET_INSERT_SELECT,
  getPersonalFleet,
  validateFleetAircraftPayload,
} from "@/lib/fleet";
import { requirePersonalAccount } from "@/lib/personal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Lists fleet aircraft for the authenticated personal account.
 */
export async function GET(request: Request) {
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

    const fleet = await getPersonalFleet(supabase, user.id);

    return Response.json(fleet);
  });
}

/**
 * Adds an aircraft to the personal fleet.
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

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const validation = validateFleetAircraftPayload(body);

    if (!validation.valid) {
      return jsonError(validation.error, 400);
    }

    const adminClient = createAdminClient();

    if (validation.payload.kind === "custom") {
      const { data: createdAircraft, error: insertError } = await adminClient
        .from("fleet_aircraft")
        .insert({
          user_id: user.id,
          organisation_id: null,
          aircraft_ref_id: null,
          manufacturer: validation.payload.manufacturer,
          model: validation.payload.model,
          tail_number: validation.payload.tail_number,
          seats: validation.payload.seats,
          rnav_equipped: validation.payload.rnav_equipped,
          custom_data: validation.payload.custom_data,
        })
        .select(FLEET_INSERT_SELECT)
        .single();

      if (insertError || !createdAircraft) {
        return jsonError(insertError?.message ?? "Failed to add aircraft", 500);
      }

      return Response.json(createdAircraft, { status: 201 });
    }

    const { data: reference, error: referenceError } = await adminClient
      .from("aircraft_reference")
      .select("id, manufacturer, model")
      .eq("id", validation.payload.aircraft_ref_id)
      .maybeSingle();

    if (referenceError) {
      return jsonError(referenceError.message, 500);
    }

    if (!reference) {
      return jsonError("Aircraft reference not found", 400);
    }

    const { data: createdAircraft, error: insertError } = await adminClient
      .from("fleet_aircraft")
      .insert({
        user_id: user.id,
        organisation_id: null,
        aircraft_ref_id: validation.payload.aircraft_ref_id,
        manufacturer: reference.manufacturer,
        model: reference.model,
        tail_number: validation.payload.tail_number,
        seats: validation.payload.seats,
        rnav_equipped: validation.payload.rnav_equipped,
        custom_data: null,
      })
      .select(FLEET_INSERT_SELECT)
      .single();

    if (insertError || !createdAircraft) {
      return jsonError(insertError?.message ?? "Failed to add aircraft", 500);
    }

    return Response.json(createdAircraft, { status: 201 });
  });
}
