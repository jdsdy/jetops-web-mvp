import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  FLEET_INSERT_SELECT,
  validateFleetAircraftUpdatePayload,
  type FleetAircraftRecord,
} from "@/lib/fleet";
import { requireOrgAdmin } from "@/lib/organisation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Loads a fleet aircraft row scoped to the organisation.
 */
async function loadOrganisationFleetAircraft(
  organisationId: string,
  aircraftId: string,
): Promise<FleetAircraftRecord | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("fleet_aircraft")
    .select(FLEET_INSERT_SELECT)
    .eq("id", aircraftId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Updates editable fleet aircraft fields for an organisation admin.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ organisationId: string; aircraftId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId, aircraftId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    logContext.set({ userId: user.id });

    const { membership, error: adminError } = await requireOrgAdmin(
      supabase,
      user.id,
      organisationId,
    );

    if (adminError || !membership) {
      return jsonError("Forbidden", 403);
    }

    logContext.set({ organisationId: membership.organisations.id });

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

    const existingAircraft = await loadOrganisationFleetAircraft(
      membership.organisations.id,
      aircraftId,
    );

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
      .eq("organisation_id", membership.organisations.id)
      .select(FLEET_INSERT_SELECT)
      .single();

    if (updateError || !updatedAircraft) {
      return jsonError(updateError?.message ?? "Failed to update aircraft", 500);
    }

    return Response.json(updatedAircraft);
  });
}

/**
 * Deletes a fleet aircraft row for an organisation admin.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ organisationId: string; aircraftId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId, aircraftId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    logContext.set({ userId: user.id });

    const { membership, error: adminError } = await requireOrgAdmin(
      supabase,
      user.id,
      organisationId,
    );

    if (adminError || !membership) {
      return jsonError("Forbidden", 403);
    }

    logContext.set({ organisationId: membership.organisations.id });

    const existingAircraft = await loadOrganisationFleetAircraft(
      membership.organisations.id,
      aircraftId,
    );

    if (!existingAircraft) {
      return jsonError("Aircraft not found", 404);
    }

    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient
      .from("fleet_aircraft")
      .delete()
      .eq("id", aircraftId)
      .eq("organisation_id", membership.organisations.id);

    if (deleteError) {
      return jsonError(deleteError.message, 500);
    }

    return new Response(null, { status: 204 });
  });
}
