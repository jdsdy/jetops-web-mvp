import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import "react-loading-skeleton/dist/skeleton.css";

import { OrganisationAppShell } from "@/components/organisation-app-shell";
import { resolveOrganisationRouteAccess } from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type OrganisationPortalLayoutProps = {
  children: ReactNode;
  params: Promise<{
    organisationId: string;
  }>;
};

/**
 * Auth gate and shared portal shell for organisation app sections.
 */
export default async function OrganisationPortalLayout({
  children,
  params,
}: OrganisationPortalLayoutProps) {
  const { organisationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const access = await resolveOrganisationRouteAccess(
    supabase,
    user.id,
    organisationId,
  );

  if (access.outcome === "redirect") {
    redirect(access.path);
  }

  const { membership } = access;

  return (
    <OrganisationAppShell
      organisationId={membership.organisations.id}
      organisationName={membership.organisations.name}
      isAdmin={membership.is_admin}
    >
      {children}
    </OrganisationAppShell>
  );
}
