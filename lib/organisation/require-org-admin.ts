import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrganisationMembership } from "./membership";
import { ORGANISATION_MEMBERSHIP_SELECT } from "./membership";

type OrgAdminMembership = {
  is_admin: boolean;
  status: string;
};

type RequireOrgAdminResult = {
  membership: OrganisationMembership | null;
  error: string | null;
};

/**
 * Returns whether a membership qualifies as an active organisation admin.
 */
export function isOrgAdminMembership(membership: OrgAdminMembership): boolean {
  return membership.is_admin && membership.status === "active";
}

/**
 * Ensures the user is an active admin of the organisation identified by slug.
 */
export async function requireOrgAdmin(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
): Promise<RequireOrgAdminResult> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(ORGANISATION_MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("organisations.slug", slug)
    .maybeSingle();

  if (error || !data) {
    return { membership: null, error: "Forbidden" };
  }

  const organisation = Array.isArray(data.organisations)
    ? data.organisations[0]
    : data.organisations;

  if (!organisation || !isOrgAdminMembership(data)) {
    return { membership: null, error: "Forbidden" };
  }

  return {
    membership: {
      role: data.role,
      is_admin: data.is_admin,
      status: data.status,
      organisations: organisation,
    },
    error: null,
  };
}
