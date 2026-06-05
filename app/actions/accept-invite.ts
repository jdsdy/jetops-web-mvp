"use server";

import { redirect } from "next/navigation";

import {
  INVITATION_INVALID_MESSAGE,
  isInvitationAcceptable,
} from "@/lib/organisation/validate-invitation";
import { createClient } from "@/lib/supabase/server";

type AcceptInviteResult = {
  error?: string;
};

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

  if (
    !isInvitationAcceptable(
      {
        invited_user_id: invitation.invited_user_id,
        expires_at: invitation.expires_at,
        accepted_at: invitation.accepted_at,
      },
      user.id,
    )
  ) {
    return { error: INVITATION_INVALID_MESSAGE };
  }

  const organisationSlug = String(user.user_metadata?.organisation_slug ?? "");

  if (!organisationSlug) {
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

  redirect(`/portal/organisation/${organisationSlug}`);
}
