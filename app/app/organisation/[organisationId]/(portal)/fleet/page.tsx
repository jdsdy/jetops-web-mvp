import { FleetSection } from "@/app/app/organisation/[organisationId]/_components/fleet-section";
import { getOrganisationFleet } from "@/lib/fleet";
import { requireOrganisationRouteMembership } from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationFleetPageProps = {
  params: Promise<{
    organisationId: string;
  }>;
};

/**
 * Organisation fleet section.
 */
export default async function OrganisationFleetPage({
  params,
}: OrganisationFleetPageProps) {
  const { organisationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const membership = await requireOrganisationRouteMembership(
    supabase,
    user!.id,
    organisationId,
  );
  const fleet = await getOrganisationFleet(supabase, organisationId);

  return (
    <FleetSection
      fleetApiBasePath={`/api/organisations/${organisationId}/fleet`}
      canManageFleet={membership?.is_admin ?? false}
      initialFleet={fleet}
    />
  );
}
