import { OrganisationMembers } from "@/app/app/organisation/[organisationId]/_components/organisation-members";
import { UserManagement } from "@/app/app/organisation/[organisationId]/_components/user-management";
import { SectionHeader } from "@/components/section-header";
import { portalCardClassName } from "@/components/portal-styles";
import {
  getActiveOrganisationMembers,
  requireOrganisationRouteMembership,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationUsersPageProps = {
  params: Promise<{
    organisationId: string;
  }>;
};

/**
 * Organisation users section.
 */
export default async function OrganisationUsersPage({
  params,
}: OrganisationUsersPageProps) {
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
  const members = await getActiveOrganisationMembers(supabase, organisationId);

  if (membership?.is_admin) {
    return (
      <UserManagement
        organisationId={organisationId}
        currentUserId={user!.id}
        initialMembers={members}
      />
    );
  }

  return (
    <div className={portalCardClassName}>
      <SectionHeader
        title="Users"
        description="Active organisation members."
      />
      <OrganisationMembers members={members} />
    </div>
  );
}
