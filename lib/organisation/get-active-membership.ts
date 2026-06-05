import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ORGANISATION_MEMBERSHIP_SELECT,
  type OrganisationMembership,
} from "./membership";

/**
 * Loads a user's active organisation membership, optionally filtered by slug.
 */
export async function getActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  slug?: string,
): Promise<OrganisationMembership | null> {
  let query = supabase
    .from("organisation_members")
    .select(ORGANISATION_MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("is_active", true);

  if (slug) {
    query = query.eq("organisations.slug", slug);
  }

  const { data } = await query.limit(1).maybeSingle();

  if (!data) {
    return null;
  }

  const organisation = Array.isArray(data.organisations)
    ? data.organisations[0]
    : data.organisations;

  if (!organisation) {
    return null;
  }

  return {
    role: data.role,
    is_active: data.is_active,
    organisations: organisation,
  };
}
