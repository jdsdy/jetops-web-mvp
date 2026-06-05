export const ORGANISATION_MEMBERSHIP_SELECT = `
  role,
  is_admin,
  status,
  organisations!inner (
    id,
    name,
    slug
  )
` as const;

export type OrganisationMembership = {
  role: string;
  is_admin: boolean;
  status: string;
  organisations: {
    id: string;
    name: string;
    slug: string;
  };
};
