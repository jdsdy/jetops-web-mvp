"use server";

import { redirect } from "next/navigation";

import {
  INVITATION_INVALID_MESSAGE,
  formatMemberDisplayName,
  getActiveMembership,
  getOrganisationRedirect,
  isInvitationAcceptable,
  validateOrganisationName,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

type CreateOrganisationResult = {
  error?: string;
};

type AcceptInviteResult = {
  error?: string;
};

/**
 * Creates an organisation for the signed-in user and redirects to the app.
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

  const membership = await getActiveMembership(supabase, user.id);

  redirect(getOrganisationRedirect(membership));
}

/**
 * Accepts a valid organisation invitation and activates pending membership.
 */
export async function acceptInvitation(
  invitationId: string,
): Promise<AcceptInviteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to accept an invite" };
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("organisation_invitations")
    .select("id, invited_user_id, expires_at, accepted_at")
    .eq("id", invitationId)
    .eq("invited_user_id", user.id)
    .maybeSingle();

  if (invitationError || !invitation) {
    return { error: invitationError?.message ?? INVITATION_INVALID_MESSAGE };
  }

  if (!isInvitationAcceptable(invitation, user.id)) {
    return { error: INVITATION_INVALID_MESSAGE };
  }

  const { error: acceptError } = await supabase.rpc(
    "accept_organisation_invitation",
    { p_invitation_id: invitationId },
  );

  if (acceptError) {
    return { error: INVITATION_INVALID_MESSAGE };
  }

  const fName = String(user.user_metadata?.f_name ?? "");
  const lInitial = String(user.user_metadata?.l_initial ?? "");

  if (fName && lInitial) {
    await supabase
      .from("profiles")
      .update({ f_name: fName, l_initial: lInitial })
      .eq("id", user.id);
  }

  const membership = await getActiveMembership(supabase, user.id);

  redirect(getOrganisationRedirect(membership));
}
