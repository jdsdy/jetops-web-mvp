import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ORGANISATION_MEMBERS_LIST_SELECT,
  type OrganisationMember,
} from "./organisation-member";

/**
 * Loads all members for an organisation by organisation ID.
 */
export async function getOrganisationMembers(
  supabase: SupabaseClient,
  organisationId: string,
): Promise<OrganisationMember[]> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(ORGANISATION_MEMBERS_LIST_SELECT)
    .eq("organisation_id", organisationId)
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}
