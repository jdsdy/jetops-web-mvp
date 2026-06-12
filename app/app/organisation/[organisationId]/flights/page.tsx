import Link from "next/link";
import { redirect } from "next/navigation";

import { FlightExtractionDetailsSection } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-details";
import { LogoutButton } from "@/components/logout-button";
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
import {
  getOrganisationAppPath,
  resolveOrganisationAppRouteAccess,
} from "@/lib/organisation";
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

export default async function OrganisationFlightsPage({
  params,
  searchParams,
}: OrganisationFlightsPageProps) {
  const { organisationId } = await params;
  const { id: flightId, jobId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const access = await resolveOrganisationAppRouteAccess(
    supabase,
    user.id,
    organisationId,
  );

  if (access.outcome === "redirect") {
    redirect(access.path);
  }

  const { membership } = access;
  const appHomePath = getOrganisationAppPath(membership.organisations.id);

  if (!flightId || !jobId) {
    redirect(appHomePath);
  }

  const extractionResult = await getFlightExtractionResult(
    supabase,
    flightId,
    membership.organisations.id,
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
    <main>
      <h1>/app/organisation/{membership.organisations.id}/flights</h1>
      <FlightExtractionDetailsSection
        organisationId={membership.organisations.id}
        flightId={flightId}
        flightPlanId={analysisJob.flightPlanId}
        jobId={jobId}
        initialDetails={extractionResult.details}
        initialJobStatus={analysisJob.status}
        initialAnalysedSnapshot={initialAnalysedSnapshot}
        initialRawNotams={initialRawNotams}
      />
      <Link href={appHomePath}>
        <button type="button">Back to app home</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
