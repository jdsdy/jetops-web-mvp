import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  isFlightExtractionEditableJobStatus,
  splitFlightExtractionUpdate,
  validateFlightExtractionUpdatePayload,
} from "@/lib/flights";
import { requireActiveOrganisationMember } from "@/lib/fleet";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Returns the analysis job status for a flight when the caller supplies a job id.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ organisationId: string; flightId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId, flightId } = await context.params;
    const jobId = new URL(request.url).searchParams.get("jobId")?.trim();

    if (!jobId) {
      return jsonError("Job id is required", 400);
    }

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

  const { data: analysisJob, error: analysisJobError } = await adminClient
    .from("analysis_jobs")
    .select("id, status, flight_plan_id")
    .eq("id", jobId)
    .eq("organisation_id", resolvedOrganisationId)
    .maybeSingle();

  if (analysisJobError || !analysisJob) {
    return jsonError("Analysis job not found", 404);
  }

  const { data: flightPlan, error: flightPlanError } = await adminClient
    .from("flight_plans")
    .select("id")
    .eq("id", analysisJob.flight_plan_id)
    .eq("flight_id", flightId)
    .maybeSingle();

  if (flightPlanError || !flightPlan) {
    return jsonError("Analysis job not found", 404);
  }

    return Response.json({
      job_id: analysisJob.id,
      status: analysisJob.status,
    });
  });
}

/**
 * Updates extracted flight and flight plan fields while awaiting confirmation.
 */
export async function PATCH(
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

    let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const validation = validateFlightExtractionUpdatePayload(body);

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

  const { data: flightPlan, error: flightPlanError } = await adminClient
    .from("flight_plans")
    .select("id")
    .eq("flight_id", flightId)
    .eq("is_current", true)
    .maybeSingle();

  if (flightPlanError || !flightPlan) {
    return jsonError("Flight plan not found", 404);
  }

  const { data: analysisJob, error: analysisJobError } = await adminClient
    .from("analysis_jobs")
    .select("id, status, flight_plan_id")
    .eq("id", validation.jobId)
    .eq("organisation_id", resolvedOrganisationId)
    .maybeSingle();

  if (analysisJobError || !analysisJob) {
    return jsonError("Analysis job not found", 404);
  }

  if (analysisJob.flight_plan_id !== flightPlan.id) {
    return jsonError("Analysis job does not match this flight plan", 400);
  }

  if (!isFlightExtractionEditableJobStatus(analysisJob.status)) {
    return jsonError("Flight details cannot be edited in the current job status", 409);
  }

  const { flight: flightUpdate, flightPlan: flightPlanUpdate } =
    splitFlightExtractionUpdate(validation.details);

  const { error: updateFlightError } = await adminClient
    .from("flights")
    .update(flightUpdate)
    .eq("id", flightId);

  if (updateFlightError) {
    return jsonError(updateFlightError.message, 500);
  }

  const { error: updateFlightPlanError } = await adminClient
    .from("flight_plans")
    .update(flightPlanUpdate)
    .eq("id", flightPlan.id);

  if (updateFlightPlanError) {
    return jsonError(updateFlightPlanError.message, 500);
  }

    return Response.json(validation.details);
  });
}
