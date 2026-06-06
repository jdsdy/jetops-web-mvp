import { redirect } from "next/navigation";

import { DISABLED_MEMBER_AUTH_ERROR } from "@/lib/auth";
import {
  getUserOrganisationMembership,
  resolveOrganisationCallbackRedirect,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves organisation membership after login and redirects to the portal.
 */
export default async function OrganisationPortalCallbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const membership = await getUserOrganisationMembership(supabase, user.id);
  const result = resolveOrganisationCallbackRedirect(membership);

  if (result.outcome === "disabled") {
    await supabase.auth.signOut();
    redirect(`/auth?error=${DISABLED_MEMBER_AUTH_ERROR}`);
  }

  redirect(result.path);
}
