"use server";

import { redirect } from "next/navigation";

import { formatMemberDisplayName } from "@/lib/organisation/display-name";
import { validateOrganisationName } from "@/lib/organisation/validate-name";
import { createClient } from "@/lib/supabase/server";

type CreateOrganisationResult = {
  error?: string;
};

/**
 * Creates an organisation for the signed-in user and redirects to its portal.
 */
export async function createOrganisation(
  _prevState: CreateOrganisationResult,
  formData: FormData,
): Promise<CreateOrganisationResult> {
  const validation = validateOrganisationName(String(formData.get("name") ?? ""));

  if (!validation.valid) {
    return { error: validation.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create an organisation" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("f_name, l_initial")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  const { error } = await supabase.rpc("create_organisation", {
    org_name: validation.name,
    org_slug: validation.slug,
    member_display_name: formatMemberDisplayName(profile.f_name, profile.l_initial),
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/portal/organisation/${validation.slug}`);
}
