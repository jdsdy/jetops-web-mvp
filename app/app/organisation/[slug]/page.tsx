import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateFlightSection } from "@/app/app/organisation/[slug]/_components/create-flight-section";
import { FlightsList } from "@/app/app/organisation/[slug]/_components/flights-list";
import { LogoutButton } from "@/components/logout-button";
import { getOrganisationFleet } from "@/lib/fleet";
import { getOrganisationFlights } from "@/lib/flights";
import { getActiveMembership, getActiveOrganisationMembers } from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationAppSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OrganisationAppSlugPage({
  params,
}: OrganisationAppSlugPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const membership = await getActiveMembership(supabase, user.id, slug);

  if (!membership) {
    redirect("/portal/organisation/setup");
  }

  const [aircraft, members, flights] = await Promise.all([
    getOrganisationFleet(supabase, membership.organisations.id),
    getActiveOrganisationMembers(supabase, membership.organisations.id),
    getOrganisationFlights(supabase, membership.organisations.id),
  ]);

  return (
    <main>
      <h1>/app/organisation/{slug}</h1>
      <p>{membership.organisations.name}</p>
      <FlightsList slug={slug} flights={flights} />
      <CreateFlightSection
        slug={slug}
        aircraft={aircraft}
        members={members}
      />
      <Link href={`/portal/organisation/${slug}`}>
        <button type="button">Go to portal</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
