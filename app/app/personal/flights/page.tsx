import { redirect } from "next/navigation";

import { FlightExtractionDetailsSection } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-details";
import {
  getAnalysisJobSummary,
  getFlightAnalysedNotamsSnapshot,
  getFlightExtractionResult,
  getRawNotamsForAnalysis,
  isAnalysisPartialFinishJobStatus,
  isAnalysisResultsReadyJobStatus,
  isExtractionReadyJobStatus,
  type FlightAnalysedNotamsSnapshot,
  type RawNotam,
} from "@/lib/flights";
import { getPersonalAppPath } from "@/lib/personal";
import { createClient } from "@/lib/supabase/server";

type PersonalFlightsPageProps = {
  searchParams: Promise<{
    id?: string;
    jobId?: string;
  }>;
};

/**
 * Personal flight analysis page for reviewing extraction and NOTAM results.
 */
export default async function PersonalFlightsPage({
  searchParams,
}: PersonalFlightsPageProps) {
  const { id: flightId, jobId } = await searchParams;
  const appHomePath = getPersonalAppPath();

  if (!flightId || !jobId) {
    redirect(appHomePath);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const extractionResult = await getFlightExtractionResult(
    supabase,
    flightId,
    { userId: user!.id },
  );

  if (!extractionResult) {
    redirect(appHomePath);
  }

  const analysisJob = await getAnalysisJobSummary(supabase, jobId);

  if (
    !analysisJob ||
    analysisJob.flightPlanId !== extractionResult.flightPlanId
  ) {
    redirect(appHomePath);
  }

  let initialAnalysedSnapshot: FlightAnalysedNotamsSnapshot | null = null;

  if (isAnalysisResultsReadyJobStatus(analysisJob.status)) {
    initialAnalysedSnapshot = await getFlightAnalysedNotamsSnapshot(
      supabase,
      jobId,
      analysisJob.flightPlanId,
      {
        includeUnclassifiedRaw: isAnalysisPartialFinishJobStatus(
          analysisJob.status,
        ),
      },
    );
  }

  let initialRawNotams: RawNotam[] = [];

  if (isExtractionReadyJobStatus(analysisJob.status)) {
    initialRawNotams = await getRawNotamsForAnalysis(
      supabase,
      jobId,
      analysisJob.flightPlanId,
    );
  }

  return (
    <FlightExtractionDetailsSection
      flightsApiBasePath="/api/personal/flights"
      flightId={flightId}
      flightPlanId={analysisJob.flightPlanId}
      jobId={jobId}
      initialDetails={extractionResult.details}
      initialJobStatus={analysisJob.status}
      initialAnalysedSnapshot={initialAnalysedSnapshot}
      initialRawNotams={initialRawNotams}
      appHomePath={appHomePath}
    />
  );
}
