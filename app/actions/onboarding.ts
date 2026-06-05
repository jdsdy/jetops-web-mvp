"use server";

import { redirect } from "next/navigation";

import { getPostOnboardingPath } from "@/lib/auth/paths";
import { validateOnboardingFields } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";

type OnboardingResult = {
  error?: string;
};

/**
 * Saves onboarding name fields and redirects to the account-type destination.
 */
export async function completeOnboarding(
  _prevState: OnboardingResult,
  formData: FormData,
): Promise<OnboardingResult> {
  const validation = validateOnboardingFields({
    fName: String(formData.get("f_name") ?? ""),
    lInitial: String(formData.get("l_initial") ?? ""),
  });

  if (!validation.valid) {
    return { error: validation.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to complete onboarding" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      f_name: validation.fName,
      l_initial: validation.lInitial,
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  redirect(getPostOnboardingPath(profile.account_type));
}
