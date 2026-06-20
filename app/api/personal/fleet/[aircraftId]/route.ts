import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  FLEET_INSERT_SELECT,
  validateFleetAircraftUpdatePayload,
  type FleetAircraftRecord,
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
 * Loads a fleet aircraft row scoped to the personal account owner.
 */
async function loadPersonalFleetAircraft(
  userId: string,
  aircraftId: string,
): Promise<FleetAircraftRecord | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("fleet_aircraft")
    .select(FLEET_INSERT_SELECT)
    .eq("id", aircraftId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Updates editable fleet aircraft fields for a personal account owner.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ aircraftId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { aircraftId } = await context.params;
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

    const validation = validateFleetAircraftUpdatePayload(body);

    if (!validation.valid) {
      return jsonError(validation.error, 400);
    }

    const existingAircraft = await loadPersonalFleetAircraft(user.id, aircraftId);

    if (!existingAircraft) {
      return jsonError("Aircraft not found", 404);
    }

    const adminClient = createAdminClient();
    const { data: updatedAircraft, error: updateError } = await adminClient
      .from("fleet_aircraft")
      .update({
        tail_number: validation.payload.tail_number,
        seats: validation.payload.seats,
        rnav_equipped: validation.payload.rnav_equipped,
      })
      .eq("id", aircraftId)
      .eq("user_id", user.id)
      .select(FLEET_INSERT_SELECT)
      .single();

    if (updateError || !updatedAircraft) {
      return jsonError(updateError?.message ?? "Failed to update aircraft", 500);
    }

    return Response.json(updatedAircraft);
  });
}

/**
 * Deletes a fleet aircraft row for a personal account owner.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ aircraftId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { aircraftId } = await context.params;
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

    const existingAircraft = await loadPersonalFleetAircraft(user.id, aircraftId);

    if (!existingAircraft) {
      return jsonError("Aircraft not found", 404);
    }

    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient
      .from("fleet_aircraft")
      .delete()
      .eq("id", aircraftId)
      .eq("user_id", user.id);

    if (deleteError) {
      return jsonError(deleteError.message, 500);
    }

    return new Response(null, { status: 204 });
  });
}
