import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/_components/onboarding-form";
import { SimpleFormPage } from "@/components/simple-form-page";
import { getRedirectForProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("f_name, l_initial, account_type")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth");
  }

  const destination = getRedirectForProfile(profile);
  if (destination !== "/onboarding") {
    redirect(destination);
  }

  return (
    <SimpleFormPage>
      <OnboardingForm accountType={profile.account_type} />
    </SimpleFormPage>
  );
}
