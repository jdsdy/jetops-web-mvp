import { redirect } from "next/navigation";

import { OrganisationSetupForm } from "@/app/app/organisation/setup/_components/organisation-setup-form";
import { SimpleFormPage } from "@/components/simple-form-page";
import {
  getActiveMembership,
  getOrganisationRedirect,
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
    redirect(getOrganisationRedirect(membership));
  }

  return (
    <SimpleFormPage>
      <OrganisationSetupForm />
    </SimpleFormPage>
  );
}
