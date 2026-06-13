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
const FEET_TO_METERS = 0.3048;
const MAX_DIMENSION_FT = 1000;

export const FAA_WEIGHT_CLASSES = [
  "Large",
  "Heavy",
  "Super",
  "Small",
  "Small+",
] as const;

export const ICAO_WTC_VALUES = ["L", "M", "H", "J"] as const;

export const AAC_VALUES = ["A", "B", "C", "D", "E"] as const;

export const ADG_VALUES = ["A", "B", "C", "D", "E", "F"] as const;

export type FaaWeightClass = (typeof FAA_WEIGHT_CLASSES)[number];
export type IcaoWtc = (typeof ICAO_WTC_VALUES)[number];
export type AacValue = (typeof AAC_VALUES)[number];
export type AdgValue = (typeof ADG_VALUES)[number];

export type FleetAircraftCustomData = {
  icao_wtc: IcaoWtc;
  weight_class: FaaWeightClass;
  wingspan_ft: number;
  length_ft: number;
  wingspan_m: number;
  length_m: number;
  aac: AacValue;
  adg: AdgValue;
};

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

export type FleetAircraftReferencePayload = {
  kind: "reference";
  aircraft_ref_id: number;
  tail_number: string;
  seats: number;
  rnav_equipped: boolean;
};

export type FleetAircraftCustomPayload = {
  kind: "custom";
  manufacturer: string;
  model: string;
  tail_number: string;
  seats: number;
  rnav_equipped: boolean;
  custom_data: FleetAircraftCustomData;
};

export type FleetAircraftPayload =
  | FleetAircraftReferencePayload
  | FleetAircraftCustomPayload;

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
 * Converts a feet measurement to meters rounded to two decimal places.
 */
export function convertFeetToMeters(feet: number): number {
  return Math.round(feet * FEET_TO_METERS * 100) / 100;
}

function parseRequiredBoolean(
  body: Record<string, unknown>,
  field: string,
): boolean | null {
  if (!(field in body) || typeof body[field] !== "boolean") {
    return null;
  }

  return body[field];
}

function parseRequiredString(
  body: Record<string, unknown>,
  field: string,
): string | null {
  if (!(field in body)) {
    return null;
  }

  const value = String(body[field] ?? "").trim();
  return value ? value : null;
}

function parseRequiredPositiveNumber(
  body: Record<string, unknown>,
  field: string,
): number | null {
  if (!(field in body)) {
    return null;
  }

  const value = Number(body[field]);

  if (!Number.isFinite(value) || value <= 0 || value > MAX_DIMENSION_FT) {
    return null;
  }

  return value;
}

function parseRequiredSeats(body: Record<string, unknown>): number | null {
  if (!("seats" in body)) {
    return null;
  }

  const seats = Number(body.seats);

  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) {
    return null;
  }

  return seats;
}

function parseSharedFleetFields(body: Record<string, unknown>) {
  const tailNumber = parseRequiredString(body, "tail_number");

  if (!tailNumber) {
    return { valid: false as const, error: "Tail number is required" };
  }

  const seats = parseRequiredSeats(body);

  if (seats === null) {
    return {
      valid: false as const,
      error: "Seats must be between 1 and 32767",
    };
  }

  const rnavEquipped = parseRequiredBoolean(body, "rnav_equipped");

  if (rnavEquipped === null) {
    return { valid: false as const, error: "rnav_equipped must be a boolean" };
  }

  return {
    valid: true as const,
    tailNumber,
    seats,
    rnavEquipped,
  };
}

function validateCustomFleetAircraftPayload(
  body: Record<string, unknown>,
): FleetPayloadValidationResult {
  const shared = parseSharedFleetFields(body);

  if (!shared.valid) {
    return shared;
  }

  const manufacturer = parseRequiredString(body, "manufacturer");

  if (!manufacturer) {
    return { valid: false, error: "Manufacturer is required" };
  }

  const model = parseRequiredString(body, "model");

  if (!model) {
    return { valid: false, error: "Model is required" };
  }

  const icaoWtc = parseRequiredString(body, "icao_wtc");

  if (!icaoWtc || !ICAO_WTC_VALUES.includes(icaoWtc as IcaoWtc)) {
    return { valid: false, error: "ICAO wake turbulence category is invalid" };
  }

  const weightClass = parseRequiredString(body, "weight_class");

  if (!weightClass || !FAA_WEIGHT_CLASSES.includes(weightClass as FaaWeightClass)) {
    return { valid: false, error: "FAA weight category is invalid" };
  }

  const wingspanFt = parseRequiredPositiveNumber(body, "wingspan_ft");

  if (wingspanFt === null) {
    return { valid: false, error: "Wingspan must be greater than zero" };
  }

  const lengthFt = parseRequiredPositiveNumber(body, "length_ft");

  if (lengthFt === null) {
    return { valid: false, error: "Length must be greater than zero" };
  }

  const aac = parseRequiredString(body, "aac");

  if (!aac || !AAC_VALUES.includes(aac as AacValue)) {
    return { valid: false, error: "Aerodrome approach category is invalid" };
  }

  const adg = parseRequiredString(body, "adg");

  if (!adg || !ADG_VALUES.includes(adg as AdgValue)) {
    return { valid: false, error: "Aircraft design group is invalid" };
  }

  return {
    valid: true,
    payload: {
      kind: "custom",
      manufacturer,
      model,
      tail_number: shared.tailNumber,
      seats: shared.seats,
      rnav_equipped: shared.rnavEquipped,
      custom_data: {
        icao_wtc: icaoWtc as IcaoWtc,
        weight_class: weightClass as FaaWeightClass,
        wingspan_ft: wingspanFt,
        length_ft: lengthFt,
        wingspan_m: convertFeetToMeters(wingspanFt),
        length_m: convertFeetToMeters(lengthFt),
        aac: aac as AacValue,
        adg: adg as AdgValue,
      },
    },
  };
}

function validateReferenceFleetAircraftPayload(
  body: Record<string, unknown>,
): FleetPayloadValidationResult {
  if (!("aircraft_ref_id" in body)) {
    return { valid: false, error: "Aircraft reference is required" };
  }

  const aircraftRefId = Number(body.aircraft_ref_id);

  if (!Number.isInteger(aircraftRefId) || aircraftRefId <= 0) {
    return { valid: false, error: "Aircraft reference is invalid" };
  }

  const shared = parseSharedFleetFields(body);

  if (!shared.valid) {
    return shared;
  }

  return {
    valid: true,
    payload: {
      kind: "reference",
      aircraft_ref_id: aircraftRefId,
      tail_number: shared.tailNumber,
      seats: shared.seats,
      rnav_equipped: shared.rnavEquipped,
    },
  };
}

/**
 * Validates a fleet aircraft create payload from the client.
 */
export function validateFleetAircraftPayload(
  body: Record<string, unknown>,
): FleetPayloadValidationResult {
  if ("custom_data" in body) {
    return { valid: false, error: "Custom data is derived on the server" };
  }

  const hasReferenceId = "aircraft_ref_id" in body;
  const hasCustomFields =
    "manufacturer" in body ||
    "model" in body ||
    "icao_wtc" in body ||
    "weight_class" in body ||
    "wingspan_ft" in body ||
    "length_ft" in body ||
    "aac" in body ||
    "adg" in body;

  if (hasReferenceId && hasCustomFields) {
    return {
      valid: false,
      error: "Provide either aircraft_ref_id or custom aircraft details, not both",
    };
  }

  if (hasCustomFields || ("manufacturer" in body && "model" in body)) {
    return validateCustomFleetAircraftPayload(body);
  }

  return validateReferenceFleetAircraftPayload(body);
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
