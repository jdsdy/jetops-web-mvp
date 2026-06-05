"use server";

import { redirect } from "next/navigation";

import { getRedirectForProfile } from "@/lib/auth/redirects";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type AuthResult = {
  error?: string;
  message?: string;
};

/**
 * Signs in a user with email and password, then redirects to their destination.
 */
export async function signInWithPassword(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unable to load user session" };
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
