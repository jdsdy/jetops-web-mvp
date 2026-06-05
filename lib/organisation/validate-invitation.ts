export type OrganisationInvitationRecord = {
  invited_user_id: string;
  expires_at: string;
  accepted_at: string | null;
};

/**
 * Returns whether an organisation invitation can still be accepted.
 */
export function isInvitationAcceptable(
  invitation: OrganisationInvitationRecord,
  userId: string,
  now: Date = new Date(),
): boolean {
  if (invitation.invited_user_id !== userId) {
    return false;
  }

  if (invitation.accepted_at !== null) {
    return false;
  }

  return new Date(invitation.expires_at) > now;
}

export const INVITATION_INVALID_MESSAGE = "This invite is no longer valid.";
