"use server";

import { redirect } from "next/navigation";

import {
  getPostOnboardingPath,
  getRedirectForProfile,
  validateOnboardingFields,
  validateSignupCode,
} from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type AuthResult = {
  error?: string;
  message?: string;
};

type OnboardingResult = {
  error?: string;
};

type SetPasswordResult = {
  error?: string;
};

/**
 * Sets a new password for the signed-in invited user and marks the profile as complete.
 */
export async function setPasswordForInvitedUser(
  _prevState: SetPasswordResult,
  formData: FormData,
): Promise<SetPasswordResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to set a password" };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });

  if (passwordError) {
    return { error: passwordError.message };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ has_set_password: true })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("f_name, l_initial, account_type")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  redirect(getRedirectForProfile(profile));
}

/**
 * Registers a new user and stores their account type in user metadata.
 */
export async function signUp(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const accountType = String(formData.get("account_type") ?? "");
  const signupCode = String(formData.get("signup_code") ?? "");

  const signupCodeValidation = await validateSignupCode(signupCode);

  if (!signupCodeValidation.valid) {
    return { error: signupCodeValidation.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth`,
      data: {
        account_type: accountType,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message: "Account created. Check your email to confirm, then continue to onboarding.",
  };
}

/**
 * Signs out the current user and redirects to the home page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

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
