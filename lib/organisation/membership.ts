export const ORGANISATION_MEMBERSHIP_SELECT = `
  role,
  is_active,
  organisations!inner (
    id,
    name,
    slug
  )
` as const;

export type OrganisationMembership = {
  role: string;
  is_active: boolean;
  organisations: {
    id: string;
    name: string;
    slug: string;
  };
};
