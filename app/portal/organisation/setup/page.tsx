import { redirect } from "next/navigation";

import { OrganisationSetupForm } from "@/app/portal/organisation/setup/_components/organisation-setup-form";
import {
  getActiveMembership,
  getOrganisationPortalRedirect,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

export default async function OrganisationSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const membership = await getActiveMembership(supabase, user.id);

  if (membership) {
    redirect(getOrganisationPortalRedirect(membership));
  }

  return (
    <main>
      <OrganisationSetupForm />
    </main>
  );
}
