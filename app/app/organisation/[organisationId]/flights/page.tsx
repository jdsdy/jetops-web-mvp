import Link from "next/link";
import { redirect } from "next/navigation";

import { FlightExtractionDetailsSection } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-details";
import { LogoutButton } from "@/components/logout-button";
import { getFlightExtractionResult } from "@/lib/flights";
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

  return (
    <main>
      <h1>/app/organisation/{membership.organisations.id}/flights</h1>
      <FlightExtractionDetailsSection
        organisationId={membership.organisations.id}
        flightId={flightId}
        flightPlanId={extractionResult.flightPlanId}
        jobId={jobId}
        initialDetails={extractionResult.details}
      />
      <Link href={appHomePath}>
        <button type="button">Back to app home</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
