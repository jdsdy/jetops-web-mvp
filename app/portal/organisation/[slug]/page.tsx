import Link from "next/link";
import { redirect } from "next/navigation";

import { OrganisationMembers } from "@/app/portal/organisation/[slug]/_components/organisation-members";
import { UserManagement } from "@/app/portal/organisation/[slug]/_components/user-management";
import { LogoutButton } from "@/components/logout-button";
import {
  getActiveMembership,
  getActiveOrganisationMembers,
} from "@/lib/organisation";
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

  const activeMembers = membership.is_admin
    ? []
    : await getActiveOrganisationMembers(supabase, membership.organisations.id);

  return (
    <main>
      <h1>/portal/organisation/{slug}</h1>
      <p>{membership.organisations.name}</p>
      {membership.is_admin ? (
        <UserManagement slug={slug} currentUserId={user.id} />
      ) : (
        <OrganisationMembers members={activeMembers} />
      )}
      <Link href="/app/organisation">
        <button type="button">Go to app/organisation</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
