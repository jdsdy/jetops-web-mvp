/**
 * Formats a member display name from profile name fields.
 */
export function formatMemberDisplayName(fName: string, lInitial: string): string {
  return `${fName.trim()} ${lInitial.trim()}`;
}
