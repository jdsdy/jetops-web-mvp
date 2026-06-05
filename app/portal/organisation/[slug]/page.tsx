import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getActiveMembership } from "@/lib/organisation/get-active-membership";
import { createClient } from "@/lib/supabase/server";

type OrganisationPortalSlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function OrganisationPortalSlugPage({
  params,
}: OrganisationPortalSlugPageProps) {
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

  return (
    <main>
      <h1>/portal/organisation/{slug}</h1>
      <p>{membership.organisations.name}</p>
      <Link href="/app/organisation">
        <button type="button">Go to app/organisation</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
