import { FleetSection } from "@/app/app/organisation/[organisationId]/_components/fleet-section";
import { getPersonalFleet } from "@/lib/fleet";
import { createClient } from "@/lib/supabase/server";

/**
 * Personal fleet section.
 */
export default async function PersonalFleetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fleet = await getPersonalFleet(supabase, user!.id);

  return (
    <FleetSection
      fleetApiBasePath="/api/personal/fleet"
      canManageFleet
      initialFleet={fleet}
    />
  );
}
