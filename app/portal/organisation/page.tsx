import { redirect } from "next/navigation";

import {
  getActiveMembership,
  getOrganisationPortalRedirect,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

export default async function OrganisationPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const membership = await getActiveMembership(supabase, user.id);
  redirect(getOrganisationPortalRedirect(membership));
}
