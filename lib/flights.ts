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

export type FlightExtractionDetails = {
  departure_icao: string | null;
  arrival_icao: string | null;
  source_app: string | null;
  route: string | null;
  cruise_level: string | null;
  dept_rwy: string | null;
  arr_rwy: string | null;
  planned_dept_time: string | null;
  planned_arr_time: string | null;
  alt_icao: string | null;
};

export type FlightExtractionResult = {
  flightPlanId: string;
  details: FlightExtractionDetails;
};

export type RawNotam = {
  id: number;
  notam_id: string;
  title: string | null;
  q: string | null;
  a: string | null;
  b: string | null;
  c: string | null;
  d: string | null;
  e: string | null;
  f: string | null;
  g: string | null;
};

export const EXTRACTION_READY_JOB_STATUSES = [
  "awaiting_confirmation",
  "processing_analysis",
  "complete",
] as const;

/**
 * Returns whether an analysis job has finished extracting flight plan data.
 */
export function isExtractionReadyJobStatus(status: string): boolean {
  return EXTRACTION_READY_JOB_STATUSES.includes(
    status as (typeof EXTRACTION_READY_JOB_STATUSES)[number],
  );
}

const FLIGHT_EXTRACTION_SELECT = `
  id,
  departure_icao,
  arrival_icao,
  flight_plans(
    id,
    source_app,
    route,
    cruise_level,
    dept_rwy,
    arr_rwy,
    planned_dept_time,
    planned_arr_time,
    alt_icao,
    is_current
  )
` as const;

const RAW_NOTAM_SELECT = `
  id,
  notam_id,
  title,
  q,
  a,
  b,
  c,
  d,
  e,
  f,
  g
` as const;

type FlightPlanExtractionRow = {
  id: string;
  source_app: string | null;
  route: string | null;
  cruise_level: string | null;
  dept_rwy: string | null;
  arr_rwy: string | null;
  planned_dept_time: string | null;
  planned_arr_time: string | null;
  alt_icao: string | null;
  is_current: boolean;
};

type FlightExtractionRow = {
  id: string;
  departure_icao: string | null;
  arrival_icao: string | null;
  flight_plans: FlightPlanExtractionRow[] | null;
};

type RawNotamRow = {
  id: number;
  notam_id: string;
  title: string | null;
  q: string | null;
  a: string | null;
  b: string | null;
  c: string | null;
  d: string | null;
  e: string | null;
  f: string | null;
  g: string | null;
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
 * Converts NOTAM placeholder newlines to real line breaks.
 */
export function formatNotamText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.replaceAll("{\\n}", "\n");
}

/**
 * Maps a raw NOTAM row to display-ready text values.
 */
export function mapRawNotamRow(row: RawNotamRow): RawNotam {
  return {
    id: row.id,
    notam_id: row.notam_id,
    title: formatNotamText(row.title),
    q: formatNotamText(row.q),
    a: formatNotamText(row.a),
    b: formatNotamText(row.b),
    c: formatNotamText(row.c),
    d: formatNotamText(row.d),
    e: formatNotamText(row.e),
    f: formatNotamText(row.f),
    g: formatNotamText(row.g),
  };
}

/**
 * Maps a flight row and current plan to extracted field values.
 */
export function mapFlightExtractionDetails(
  flight: FlightExtractionRow,
): FlightExtractionDetails {
  return mapFlightExtractionResult(flight).details;
}

/**
 * Maps a flight row and current plan to extracted values plus plan id.
 */
export function mapFlightExtractionResult(
  flight: FlightExtractionRow,
): FlightExtractionResult {
  const currentPlan =
    flight.flight_plans?.find((plan) => plan.is_current) ??
    flight.flight_plans?.[0] ??
    null;

  return {
    flightPlanId: currentPlan?.id ?? "",
    details: {
      departure_icao: flight.departure_icao,
      arrival_icao: flight.arrival_icao,
      source_app: currentPlan?.source_app ?? null,
      route: currentPlan?.route ?? null,
      cruise_level: currentPlan?.cruise_level ?? null,
      dept_rwy: currentPlan?.dept_rwy ?? null,
      arr_rwy: currentPlan?.arr_rwy ?? null,
      planned_dept_time: currentPlan?.planned_dept_time ?? null,
      planned_arr_time: currentPlan?.planned_arr_time ?? null,
      alt_icao: currentPlan?.alt_icao ?? null,
    },
  };
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

/**
 * Loads extracted flight and plan fields plus the current plan id.
 */
export async function getFlightExtractionResult(
  supabase: SupabaseClient,
  flightId: string,
  organisationId?: string,
): Promise<FlightExtractionResult | null> {
  let query = supabase
    .from("flights")
    .select(FLIGHT_EXTRACTION_SELECT)
    .eq("id", flightId);

  if (organisationId) {
    query = query.eq("organisation_id", organisationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapFlightExtractionResult(data as FlightExtractionRow);
}

/**
 * Loads extracted flight and plan fields for the flights detail page.
 */
export async function getFlightExtractionDetails(
  supabase: SupabaseClient,
  flightId: string,
  organisationId?: string,
): Promise<FlightExtractionDetails | null> {
  const result = await getFlightExtractionResult(
    supabase,
    flightId,
    organisationId,
  );

  return result?.details ?? null;
}

/**
 * Loads raw NOTAMs for an analysis job and flight plan pair.
 */
export async function getRawNotamsForAnalysis(
  supabase: SupabaseClient,
  analysisJobId: string,
  flightPlanId: string,
): Promise<RawNotam[]> {
  if (!flightPlanId) {
    return [];
  }

  const { data, error } = await supabase
    .from("raw_notams")
    .select(RAW_NOTAM_SELECT)
    .eq("analysis_job_id", analysisJobId)
    .eq("flight_plan_id", flightPlanId)
    .order("id", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as RawNotamRow[]).map(mapRawNotamRow);
}
