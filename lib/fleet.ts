import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getActiveMembership,
  type OrganisationMembership,
} from "@/lib/organisation";

const FLEET_LIST_SELECT = `
  id,
  manufacturer,
  model,
  tail_number,
  seats,
  rnav_equipped
` as const;

const FLEET_INSERT_SELECT = `
  id,
  manufacturer,
  model,
  tail_number,
  seats,
  rnav_equipped,
  aircraft_ref_id,
  created_at
` as const;

const MAX_SEATS = 32767;

export type AircraftReferenceRow = {
  id: number;
  manufacturer: string;
  model: string;
};

export type AircraftReferenceGroup = {
  manufacturer: string;
  models: { id: number; model: string }[];
};

export type FleetAircraftListItem = {
  id: string;
  manufacturer: string;
  model: string;
  tail_number: string;
  seats: number;
  rnav_equipped: boolean;
};

export type FleetAircraftPayload = {
  aircraft_ref_id: number;
  tail_number: string;
  seats: number;
  rnav_equipped: boolean;
};

export type FleetAircraftUpdatePayload = {
  tail_number: string;
  seats: number;
  rnav_equipped: boolean;
};

type FleetPayloadValidationSuccess = {
  valid: true;
  payload: FleetAircraftPayload;
};

type FleetPayloadValidationFailure = {
  valid: false;
  error: string;
};

export type FleetPayloadValidationResult =
  | FleetPayloadValidationSuccess
  | FleetPayloadValidationFailure;

type FleetUpdatePayloadValidationSuccess = {
  valid: true;
  payload: FleetAircraftUpdatePayload;
};

type FleetUpdatePayloadValidationFailure = {
  valid: false;
  error: string;
};

export type FleetUpdatePayloadValidationResult =
  | FleetUpdatePayloadValidationSuccess
  | FleetUpdatePayloadValidationFailure;

export type FleetAircraftRecord = FleetAircraftListItem & {
  aircraft_ref_id: number | null;
  created_at: string;
};

type RequireActiveOrganisationMemberResult = {
  membership: OrganisationMembership | null;
  error: string | null;
};

/**
 * Groups flat aircraft reference rows by manufacturer for dropdown menus.
 */
export function groupAircraftReferenceByManufacturer(
  rows: AircraftReferenceRow[],
): AircraftReferenceGroup[] {
  const byManufacturer = new Map<string, { id: number; model: string }[]>();

  for (const row of rows) {
    const models = byManufacturer.get(row.manufacturer) ?? [];
    models.push({ id: row.id, model: row.model });
    byManufacturer.set(row.manufacturer, models);
  }

  return Array.from(byManufacturer.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([manufacturer, models]) => ({ manufacturer, models }));
}

/**
 * Validates a fleet aircraft create payload from the client.
 */
export function validateFleetAircraftPayload(
  body: Record<string, unknown>,
): FleetPayloadValidationResult {
  if ("manufacturer" in body || "model" in body || "custom_data" in body) {
    return {
      valid: false,
      error: "Manufacturer and model are derived from the aircraft reference",
    };
  }

  if (!("aircraft_ref_id" in body)) {
    return { valid: false, error: "Aircraft reference is required" };
  }

  const aircraftRefId = Number(body.aircraft_ref_id);

  if (!Number.isInteger(aircraftRefId) || aircraftRefId <= 0) {
    return { valid: false, error: "Aircraft reference is invalid" };
  }

  if (!("tail_number" in body)) {
    return { valid: false, error: "Tail number is required" };
  }

  const tailNumber = String(body.tail_number ?? "").trim();

  if (!tailNumber) {
    return { valid: false, error: "Tail number is required" };
  }

  if (!("seats" in body)) {
    return { valid: false, error: "Seats is required" };
  }

  const seats = Number(body.seats);

  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) {
    return { valid: false, error: "Seats must be between 1 and 32767" };
  }

  if (!("rnav_equipped" in body) || typeof body.rnav_equipped !== "boolean") {
    return { valid: false, error: "rnav_equipped must be a boolean" };
  }

  return {
    valid: true,
    payload: {
      aircraft_ref_id: aircraftRefId,
      tail_number: tailNumber,
      seats,
      rnav_equipped: body.rnav_equipped,
    },
  };
}

/**
 * Validates a fleet aircraft update payload from the client.
 */
export function validateFleetAircraftUpdatePayload(
  body: Record<string, unknown>,
): FleetUpdatePayloadValidationResult {
  if ("manufacturer" in body || "model" in body || "aircraft_ref_id" in body) {
    return {
      valid: false,
      error: "Manufacturer and model cannot be changed",
    };
  }

  if ("custom_data" in body) {
    return { valid: false, error: "Custom data cannot be updated yet" };
  }

  if (!("tail_number" in body)) {
    return { valid: false, error: "Tail number is required" };
  }

  const tailNumber = String(body.tail_number ?? "").trim();

  if (!tailNumber) {
    return { valid: false, error: "Tail number is required" };
  }

  if (!("seats" in body)) {
    return { valid: false, error: "Seats is required" };
  }

  const seats = Number(body.seats);

  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) {
    return { valid: false, error: "Seats must be between 1 and 32767" };
  }

  if (!("rnav_equipped" in body) || typeof body.rnav_equipped !== "boolean") {
    return { valid: false, error: "rnav_equipped must be a boolean" };
  }

  return {
    valid: true,
    payload: {
      tail_number: tailNumber,
      seats,
      rnav_equipped: body.rnav_equipped,
    },
  };
}

/**
 * Loads an organisation's fleet aircraft for display.
 */
export async function getOrganisationFleet(
  supabase: SupabaseClient,
  organisationId: string,
): Promise<FleetAircraftListItem[]> {
  const { data, error } = await supabase
    .from("fleet_aircraft")
    .select(FLEET_LIST_SELECT)
    .eq("organisation_id", organisationId)
    .order("manufacturer", { ascending: true })
    .order("model", { ascending: true })
    .order("tail_number", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Ensures the user is an active member of the organisation identified by id.
 */
export async function requireActiveOrganisationMember(
  supabase: SupabaseClient,
  userId: string,
  organisationId: string,
): Promise<RequireActiveOrganisationMemberResult> {
  const membership = await getActiveMembership(supabase, userId, organisationId);

  if (!membership) {
    return { membership: null, error: "Forbidden" };
  }

  return { membership, error: null };
}

export { FLEET_INSERT_SELECT };
