const INVITE_EXPIRY_DAYS = 7;

/**
 * Returns the default expiry timestamp for organisation invitations.
 */
export function getInviteExpiryDate(now: Date = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}
