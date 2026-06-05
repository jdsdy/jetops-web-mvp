export const ORGANISATION_MEMBERS_LIST_SELECT = `
  id,
  display_name,
  role,
  status
` as const;

export type OrganisationMember = {
  id: number;
  display_name: string | null;
  role: string;
  status: string;
};
