import { FlightsSection } from "@/app/app/organisation/[organisationId]/_components/flights-section";
import { getOrganisationFleet } from "@/lib/fleet";
import { getOrganisationFlights } from "@/lib/flights";
import { getActiveOrganisationMembers } from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationFlightsPageProps = {
  params: Promise<{
    organisationId: string;
  }>;
};

/**
 * Default organisation portal section listing flights.
 */
export default async function OrganisationFlightsPage({
  params,
}: OrganisationFlightsPageProps) {
  const { organisationId } = await params;
  const supabase = await createClient();

  const [aircraft, members, flights] = await Promise.all([
    getOrganisationFleet(supabase, organisationId),
    getActiveOrganisationMembers(supabase, organisationId),
    getOrganisationFlights(supabase, organisationId),
  ]);

  return (
    <FlightsSection
      organisationId={organisationId}
      flights={flights}
      aircraft={aircraft}
      members={members}
    />
  );
}
