import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPostOnboardingPath,
  isOnboardingComplete,
  type ProfileNameFields,
} from "@/lib/auth";

const PERSONAL_PROFILE_SELECT = "id, f_name, l_initial, account_type" as const;

export type PersonalProfile = ProfileNameFields & {
  id: string;
};

type RequirePersonalAccountResult =
  | { profile: PersonalProfile; error: null }
  | { profile: null; error: "Forbidden" };

type PersonalRouteAccess =
  | { outcome: "ok"; profile: PersonalProfile }
  | { outcome: "redirect"; path: string };

/**
 * Returns the personal app home path.
 */
export function getPersonalAppPath(): string {
  return "/app/personal";
}

/**
 * Returns the personal flight analysis page path for a flight and job.
 */
export function getPersonalFlightsAnalysisPath(
  flightId: string,
  jobId: string,
): string {
  const params = new URLSearchParams({
    id: flightId,
    jobId,
  });

  return `/app/personal/flights?${params.toString()}`;
}

/**
 * Ensures the user has a personal account profile.
 */
export async function requirePersonalAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<RequirePersonalAccountResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PERSONAL_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || data.account_type !== "personal") {
    return { profile: null, error: "Forbidden" };
  }

  return { profile: data, error: null };
}

/**
 * Resolves access for a personal-scoped app route.
 */
export async function resolvePersonalRouteAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalRouteAccess> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PERSONAL_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return { outcome: "redirect", path: "/auth" };
  }

  if (!isOnboardingComplete(data)) {
    return { outcome: "redirect", path: "/onboarding" };
  }

  if (data.account_type !== "personal") {
    return {
      outcome: "redirect",
      path: getPostOnboardingPath(data.account_type),
    };
  }

  return { outcome: "ok", profile: data };
}
