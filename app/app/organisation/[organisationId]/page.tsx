import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateFlightSection } from "@/app/app/organisation/[organisationId]/_components/create-flight-section";
import { FlightsList } from "@/app/app/organisation/[organisationId]/_components/flights-list";
import { LogoutButton } from "@/components/logout-button";
import { getOrganisationFleet } from "@/lib/fleet";
import { getOrganisationFlights } from "@/lib/flights";
import {
  getActiveOrganisationMembers,
  getOrganisationPortalPath,
  resolveOrganisationAppRouteAccess,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationAppPageProps = {
  params: Promise<{
    organisationId: string;
  }>;
};

export default async function OrganisationAppHomePage({
  params,
}: OrganisationAppPageProps) {
  const { organisationId } = await params;
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
  const resolvedOrganisationId = membership.organisations.id;

  const [aircraft, members, flights] = await Promise.all([
    getOrganisationFleet(supabase, resolvedOrganisationId),
    getActiveOrganisationMembers(supabase, resolvedOrganisationId),
    getOrganisationFlights(supabase, resolvedOrganisationId),
  ]);

  return (
    <main>
      <h1>/app/organisation/{resolvedOrganisationId}</h1>
      <p>{membership.organisations.name}</p>
      <FlightsList organisationId={resolvedOrganisationId} flights={flights} />
      <CreateFlightSection
        organisationId={resolvedOrganisationId}
        aircraft={aircraft}
        members={members}
      />
      <Link href={getOrganisationPortalPath(resolvedOrganisationId)}>
        <button type="button">Go to portal</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
