import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import { validateNotamFeedbackPayload } from "@/lib/notam-feedback";
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
 * Stores feedback for an analysed NOTAM on the current flight plan.
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const validation = validateNotamFeedbackPayload(body);

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
      .eq("id", validation.flightPlanId)
      .eq("flight_id", flightId)
      .maybeSingle();

    if (flightPlanError || !flightPlan) {
      return jsonError("Flight plan not found", 404);
    }

    const { data: analysedNotam, error: analysedNotamError } = await adminClient
      .from("analysed_notams")
      .select("id, flight_plan_id, anaysis_job_id")
      .eq("id", validation.analysedNotamId)
      .eq("flight_plan_id", validation.flightPlanId)
      .maybeSingle();

    if (analysedNotamError || !analysedNotam) {
      return jsonError("Analysed NOTAM not found", 404);
    }

    const { data: analysisJob, error: analysisJobError } = await adminClient
      .from("analysis_jobs")
      .select("id")
      .eq("id", analysedNotam.anaysis_job_id)
      .eq("organisation_id", resolvedOrganisationId)
      .maybeSingle();

    if (analysisJobError || !analysisJob) {
      return jsonError("Analysed NOTAM not found", 404);
    }

    const { data: feedback, error: insertError } = await adminClient
      .from("notam_feedback")
      .insert({
        flight_plan_id: validation.flightPlanId,
        analysed_notam_d: validation.analysedNotamId,
        user_id: user.id,
        reason: validation.reasonCsv,
        comment: validation.comment,
      })
      .select("id, created_at")
      .single();

    if (insertError || !feedback) {
      return jsonError(insertError?.message ?? "Failed to save feedback", 500);
    }

    return NextResponse.json(
      {
        id: feedback.id,
        created_at: feedback.created_at,
      },
      { status: 201 },
    );
  });
}
