import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import "react-loading-skeleton/dist/skeleton.css";

import { PersonalAppShell } from "@/components/personal-app-shell";
import { formatMemberDisplayName } from "@/lib/organisation";
import { resolvePersonalRouteAccess } from "@/lib/personal";
import { createClient } from "@/lib/supabase/server";

type PersonalPortalLayoutProps = {
  children: ReactNode;
};

/**
 * Auth gate and shared portal shell for personal app sections.
 */
export default async function PersonalPortalLayout({
  children,
}: PersonalPortalLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const access = await resolvePersonalRouteAccess(supabase, user.id);

  if (access.outcome === "redirect") {
    redirect(access.path);
  }

  const { profile } = access;

  return (
    <PersonalAppShell
      userDisplayName={formatMemberDisplayName(profile.f_name, profile.l_initial)}
    >
      {children}
    </PersonalAppShell>
  );
}
