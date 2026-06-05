export type OrganisationMembershipSummary = {
  organisations: {
    slug: string;
  };
};

/**
 * Returns the portal route for a user's active organisation membership.
 */
export function getOrganisationPortalRedirect(
  membership: OrganisationMembershipSummary | null,
): string {
  if (!membership) {
    return "/portal/organisation/setup";
  }

  return `/portal/organisation/${membership.organisations.slug}`;
}
