import { NextResponse } from "next/server";

import {
  FLEET_INSERT_SELECT,
  getOrganisationFleet,
  requireActiveOrganisationMember,
  validateFleetAircraftPayload,
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
 * Lists fleet aircraft for the organisation identified by id.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  const { organisationId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { membership, error: memberError } = await requireActiveOrganisationMember(
    supabase,
    user.id,
    organisationId,
  );

  if (memberError || !membership) {
    return jsonError("Forbidden", 403);
  }

  const fleet = await getOrganisationFleet(
    supabase,
    membership.organisations.id,
  );

  return Response.json(fleet);
}

/**
 * Adds an aircraft to the organisation fleet.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  const { organisationId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { membership, error: adminError } = await requireOrgAdmin(
    supabase,
    user.id,
    organisationId,
  );

  if (adminError || !membership) {
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
      organisation_id: membership.organisations.id,
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
}
