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
import { getOrganisationAppPath } from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationFlightsPageProps = {
  params: Promise<{
    organisationId: string;
  }>;
  searchParams: Promise<{
    id?: string;
    jobId?: string;
  }>;
};

/**
 * Flight analysis page for reviewing extraction and NOTAM results.
 */
export default async function OrganisationFlightsPage({
  params,
  searchParams,
}: OrganisationFlightsPageProps) {
  const { organisationId } = await params;
  const { id: flightId, jobId } = await searchParams;
  const appHomePath = getOrganisationAppPath(organisationId);

  if (!flightId || !jobId) {
    redirect(appHomePath);
  }

  const supabase = await createClient();
  const extractionResult = await getFlightExtractionResult(
    supabase,
    flightId,
    organisationId,
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
      organisationId={organisationId}
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
