import { redirect } from "next/navigation";

import { OrganisationSetupForm } from "@/app/portal/organisation/setup/_components/organisation-setup-form";
import { getActiveMembership } from "@/lib/organisation/get-active-membership";
import { getOrganisationPortalRedirect } from "@/lib/organisation/portal-redirect";
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
