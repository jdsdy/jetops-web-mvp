import Link from "next/link";
import { redirect } from "next/navigation";

import { FleetSection } from "@/app/portal/organisation/[organisationId]/_components/fleet-section";
import { OrganisationMembers } from "@/app/portal/organisation/[organisationId]/_components/organisation-members";
import { UserManagement } from "@/app/portal/organisation/[organisationId]/_components/user-management";
import { LogoutButton } from "@/components/logout-button";
import {
  getActiveOrganisationMembers,
  getOrganisationAppPath,
  resolveOrganisationPortalRouteAccess,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationPortalPageProps = {
  params: Promise<{
    organisationId: string;
  }>;
};

export default async function OrganisationPortalPage({
  params,
}: OrganisationPortalPageProps) {
  const { organisationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const access = await resolveOrganisationPortalRouteAccess(
    supabase,
    user.id,
    organisationId,
  );

  if (access.outcome === "redirect") {
    redirect(access.path);
  }

  const { membership } = access;
  const activeMembers = membership.is_admin
    ? []
    : await getActiveOrganisationMembers(supabase, membership.organisations.id);

  return (
    <main>
      <h1>/portal/organisation/{membership.organisations.id}</h1>
      <p>{membership.organisations.name}</p>
      {membership.is_admin ? (
        <UserManagement
          organisationId={membership.organisations.id}
          currentUserId={user.id}
        />
      ) : (
        <OrganisationMembers members={activeMembers} />
      )}
      <FleetSection
        organisationId={membership.organisations.id}
        isAdmin={membership.is_admin}
      />
      <Link href={getOrganisationAppPath(membership.organisations.id)}>
        <button type="button">Go to app/organisation</button>
      </Link>
      <LogoutButton />
    </main>
  );
}
