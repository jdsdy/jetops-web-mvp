import { redirect } from "next/navigation";

import {
  getOrganisationPortalRedirect,
  getUserOrganisationMembership,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

/**
 * Redirects organisation users to their slug-scoped app home.
 */
export default async function OrganisationAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const membership = await getUserOrganisationMembership(supabase, user.id);

  if (!membership || membership.status !== "active") {
    redirect(getOrganisationPortalRedirect(membership));
  }

  redirect(`/app/organisation/${membership.organisations.slug}`);
}
