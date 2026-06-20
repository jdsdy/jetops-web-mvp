import { FlightsSection } from "@/app/app/organisation/[organisationId]/_components/flights-section";
import { getPersonalFleet } from "@/lib/fleet";
import { getPersonalFlights } from "@/lib/flights";
import { getPersonalAppPath } from "@/lib/personal";
import { createClient } from "@/lib/supabase/server";

/**
 * Personal app home section listing flights.
 */
export default async function PersonalAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [aircraft, flights] = await Promise.all([
    getPersonalFleet(supabase, user!.id),
    getPersonalFlights(supabase, user!.id),
  ]);

  const appHomePath = getPersonalAppPath();

  return (
    <FlightsSection
      analysisPageBasePath={`${appHomePath}/flights`}
      createFlightApiPath="/api/personal/flights"
      flights={flights}
      aircraft={aircraft}
    />
  );
}
