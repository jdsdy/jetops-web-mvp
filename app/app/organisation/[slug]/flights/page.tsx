import Link from "next/link";
import { redirect } from "next/navigation";

import { FlightJobStatus } from "@/app/app/organisation/[slug]/flights/_components/flight-job-status";
import { LogoutButton } from "@/components/logout-button";
import { getActiveMembership } from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationFlightsPageProps = {
  params: Promise<{
    slug: string;
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
  const { slug } = await params;
  const { id: flightId, jobId } = await searchParams;
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

  if (!flightId || !jobId) {
    redirect(`/app/organisation/${slug}`);
  }

  return (
    <main>
      <h1>/app/organisation/{slug}/flights</h1>
      <p>Flight ID: {flightId}</p>
      <FlightJobStatus jobId={jobId} />
      <Link href={`/app/organisation/${slug}`}>
        <button type="button">Back to app home</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
