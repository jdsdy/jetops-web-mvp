import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import { getJetOpsApiKey, getJetOpsApiUrl } from "@/lib/env";
import {
  buildFlightAnalysisRequestBodyForUser,
  isFlightAnalysisBegunResponse,
  isFlightExtractionEditableJobStatus,
  validateFlightAnalysisRequestPayload,
} from "@/lib/flights";
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
 * Triggers downstream analysis for a confirmed personal flight plan extraction.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ flightId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { flightId } = await context.params;
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const validation = validateFlightAnalysisRequestPayload(body);

    if (!validation.valid) {
      return jsonError(validation.error, 400);
    }

    const adminClient = createAdminClient();

    const { data: flight, error: flightError } = await adminClient
      .from("flights")
      .select("id")
      .eq("id", flightId)
      .eq("user_id", user.id)
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
      .eq("user_id", user.id)
      .maybeSingle();

    if (analysisJobError || !analysisJob) {
      return jsonError("Analysis job not found", 404);
    }

    if (analysisJob.flight_plan_id !== flightPlan.id) {
      return jsonError("Analysis job does not match this flight plan", 400);
    }

    if (!isFlightExtractionEditableJobStatus(analysisJob.status)) {
      return jsonError("Analysis cannot be started in the current job status", 409);
    }

    const jetOpsApiKey = getJetOpsApiKey();

    if (!jetOpsApiKey) {
      return jsonError("JetOps API key is not configured", 500);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return jsonError("Authenticated session is required", 401);
    }

    let externalResponse: Response;

    try {
      externalResponse = await fetch(`${getJetOpsApiUrl()}/v1/jobs/analysis`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "X-API-KEY": jetOpsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildFlightAnalysisRequestBodyForUser(
            user.id,
            flightId,
            validation.jobId,
            flightPlan.id,
          ),
        ),
      });
    } catch {
      return jsonError("Failed to contact analysis service", 502);
    }

    if (!externalResponse.ok) {
      await externalResponse.json().catch(() => null);
      return jsonError("Analysis service rejected the analysis request", 502);
    }

    const externalBody: unknown = await externalResponse.json().catch(() => null);

    if (!isFlightAnalysisBegunResponse(externalBody)) {
      return jsonError("Analysis service did not begin processing", 502);
    }

    return Response.json(externalBody);
  });
}
