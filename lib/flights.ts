import type { SupabaseClient } from "@supabase/supabase-js";

export const FLIGHT_PLAN_BUCKET = "flight_plan_pdfs";
export const MAX_FLIGHT_PLAN_BYTES = 10 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FLIGHT_LIST_SELECT = `
  id,
  created_at,
  status,
  departure_icao,
  arrival_icao,
  fleet_aircraft(tail_number, model),
  flight_plans(
    id,
    is_current,
    analysis_jobs(id, status)
  )
` as const;

export type CreateFlightPayload = {
  aircraft_id: string;
  pic_user_id: string;
  flight_plan: File;
};

type CreateFlightValidationSuccess = {
  valid: true;
  payload: CreateFlightPayload;
};

type CreateFlightValidationFailure = {
  valid: false;
  error: string;
};

export type CreateFlightValidationResult =
  | CreateFlightValidationSuccess
  | CreateFlightValidationFailure;

export type OrganisationFlightListItem = {
  id: string;
  created_at: string;
  status: string | null;
  departure_icao: string | null;
  arrival_icao: string | null;
  tail_number: string | null;
  model: string | null;
  job_id: string | null;
  job_status: string | null;
};

type FlightRow = {
  id: string;
  created_at: string;
  status: string | null;
  departure_icao: string | null;
  arrival_icao: string | null;
  fleet_aircraft:
    | { tail_number: string; model: string }
    | { tail_number: string; model: string }[]
    | null;
  flight_plans:
    | {
        id: string;
        is_current: boolean;
        analysis_jobs: { id: string; status: string }[] | null;
      }[]
    | null;
};

/**
 * Builds the storage object path for an uploaded flight plan PDF.
 */
export function buildFlightPlanStoragePath(
  organisationId: string,
  flightId: string,
  flightPlanId: string,
  filename: string,
): string {
  return `${organisationId}/${flightId}/${flightPlanId}/${filename}`;
}

/**
 * Normalises an uploaded filename to a safe PDF object name.
 */
export function sanitizeFlightPlanFilename(filename: string): string {
  const basename = filename.split(/[/\\]/).pop()?.trim() ?? "";

  if (!basename) {
    return "briefing.pdf";
  }

  const withoutExtension = basename.replace(/\.pdf$/i, "");
  const safeStem = withoutExtension.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  if (!safeStem) {
    return "briefing.pdf";
  }

  return `${safeStem}.pdf`;
}

/**
 * Returns the first row when Supabase returns an object or one-item array.
 */
function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Maps a joined flights query row to a list item.
 */
function mapFlightRow(flight: FlightRow): OrganisationFlightListItem {
  const currentPlan = flight.flight_plans?.find((plan) => plan.is_current) ?? null;
  const analysisJob = currentPlan?.analysis_jobs?.[0] ?? null;
  const aircraft = firstRelation(flight.fleet_aircraft);

  return {
    id: flight.id,
    created_at: flight.created_at,
    status: flight.status,
    departure_icao: flight.departure_icao,
    arrival_icao: flight.arrival_icao,
    tail_number: aircraft?.tail_number ?? null,
    model: aircraft?.model ?? null,
    job_id: analysisJob?.id ?? null,
    job_status: analysisJob?.status ?? null,
  };
}

/**
 * Validates multipart form data for creating a flight with a PDF upload.
 */
export function validateCreateFlightFormData(
  formData: FormData,
): CreateFlightValidationResult {
  const aircraftId = String(formData.get("aircraft_id") ?? "").trim();
  const picUserId = String(formData.get("pic_user_id") ?? "").trim();
  const flightPlan = formData.get("flight_plan");

  if (!aircraftId) {
    return { valid: false, error: "Aircraft is required" };
  }

  if (!UUID_PATTERN.test(aircraftId)) {
    return { valid: false, error: "Aircraft is invalid" };
  }

  if (!picUserId) {
    return { valid: false, error: "PIC is required" };
  }

  if (!UUID_PATTERN.test(picUserId)) {
    return { valid: false, error: "PIC is invalid" };
  }

  if (!(flightPlan instanceof File) || flightPlan.size === 0) {
    return { valid: false, error: "Flight plan PDF is required" };
  }

  const isPdfMime =
    flightPlan.type === "application/pdf" ||
    flightPlan.type === "application/x-pdf";
  const isPdfName = flightPlan.name.toLowerCase().endsWith(".pdf");

  if (!isPdfMime && !isPdfName) {
    return { valid: false, error: "Flight plan must be a PDF file" };
  }

  if (flightPlan.size > MAX_FLIGHT_PLAN_BYTES) {
    return { valid: false, error: "Flight plan must be 10MB or smaller" };
  }

  return {
    valid: true,
    payload: {
      aircraft_id: aircraftId,
      pic_user_id: picUserId,
      flight_plan: flightPlan,
    },
  };
}

/**
 * Loads organisation flights with current plan analysis status for navigation.
 */
export async function getOrganisationFlights(
  supabase: SupabaseClient,
  organisationId: string,
): Promise<OrganisationFlightListItem[]> {
  const { data, error } = await supabase
    .from("flights")
    .select(FLIGHT_LIST_SELECT)
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as FlightRow[]).map(mapFlightRow);
}
