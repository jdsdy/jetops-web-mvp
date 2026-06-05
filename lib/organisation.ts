import type { SupabaseClient } from "@supabase/supabase-js";

const MEMBERSHIP_SELECT = `
  role,
  is_admin,
  status,
  organisations!inner (
    id,
    name,
    slug
  )
` as const;

const MEMBERS_LIST_SELECT = `
  id,
  display_name,
  role,
  status
` as const;

const INVITE_EXPIRY_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVITATION_INVALID_MESSAGE = "This invite is no longer valid.";

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

export type OrganisationMember = {
  id: number;
  display_name: string | null;
  role: string;
  status: string;
};

export type OrganisationInvitationRecord = {
  invited_user_id: string;
  expires_at: string;
  accepted_at: string | null;
};

type InviteInput = {
  email: string;
  fName: string;
  lInitial: string;
  role: string;
};

type InviteValidationSuccess = {
  valid: true;
  email: string;
  fName: string;
  lInitial: string;
  role: string;
};

type InviteValidationFailure = {
  valid: false;
  error: string;
};

export type InviteValidationResult = InviteValidationSuccess | InviteValidationFailure;

type OrganisationNameValidationSuccess = {
  valid: true;
  name: string;
  slug: string;
};

type OrganisationNameValidationFailure = {
  valid: false;
  error: string;
};

export type OrganisationNameValidation =
  | OrganisationNameValidationSuccess
  | OrganisationNameValidationFailure;

type RequireOrgAdminResult = {
  membership: OrganisationMembership | null;
  error: string | null;
};

/**
 * Converts an organisation display name into a URL-safe slug.
 */
export function organisationNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Formats a member display name from profile name fields.
 */
export function formatMemberDisplayName(fName: string, lInitial: string): string {
  return `${fName.trim()} ${lInitial.trim()}`;
}

/**
 * Validates an organisation name and derives its slug.
 */
export function validateOrganisationName(name: string): OrganisationNameValidation {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Organisation name is required" };
  }

  const slug = organisationNameToSlug(trimmed);

  if (!slug) {
    return {
      valid: false,
      error: "Organisation name must contain letters or numbers",
    };
  }

  return { valid: true, name: trimmed, slug };
}

/**
 * Validates organisation invite payload fields.
 */
export function validateInvitePayload(input: InviteInput): InviteValidationResult {
  const email = input.email.trim();
  const fName = input.fName.trim();
  const lInitial = input.lInitial.trim();
  const role = input.role.trim();

  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { valid: false, error: "Email is invalid" };
  }

  if (!fName) {
    return { valid: false, error: "First name is required" };
  }

  if (!lInitial) {
    return { valid: false, error: "Last name initial is required" };
  }

  if (!role) {
    return { valid: false, error: "Role is required" };
  }

  return { valid: true, email, fName, lInitial, role };
}

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

/**
 * Returns the default expiry timestamp for organisation invitations.
 */
export function getInviteExpiryDate(now: Date = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}

/**
 * Returns the portal route for a user's active organisation membership.
 */
export function getOrganisationPortalRedirect(
  membership: Pick<OrganisationMembership, "organisations"> | null,
): string {
  if (!membership) {
    return "/portal/organisation/setup";
  }

  return `/portal/organisation/${membership.organisations.slug}`;
}

/**
 * Returns whether a membership qualifies as an active organisation admin.
 */
export function isOrgAdminMembership(membership: {
  is_admin: boolean;
  status: string;
}): boolean {
  return membership.is_admin && membership.status === "active";
}

function normaliseMembershipRow(data: {
  role: string;
  is_admin: boolean;
  status: string;
  organisations:
    | OrganisationMembership["organisations"]
    | OrganisationMembership["organisations"][];
}): OrganisationMembership | null {
  const organisation = Array.isArray(data.organisations)
    ? data.organisations[0]
    : data.organisations;

  if (!organisation) {
    return null;
  }

  return {
    role: data.role,
    is_admin: data.is_admin,
    status: data.status,
    organisations: organisation,
  };
}

/**
 * Loads a user's active organisation membership, optionally filtered by slug.
 */
export async function getActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  slug?: string,
): Promise<OrganisationMembership | null> {
  let query = supabase
    .from("organisation_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("status", "active");

  if (slug) {
    query = query.eq("organisations.slug", slug);
  }

  const { data } = await query.limit(1).maybeSingle();

  if (!data) {
    return null;
  }

  return normaliseMembershipRow(data);
}

/**
 * Loads all members for an organisation by organisation ID.
 */
export async function getOrganisationMembers(
  supabase: SupabaseClient,
  organisationId: string,
): Promise<OrganisationMember[]> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(MEMBERS_LIST_SELECT)
    .eq("organisation_id", organisationId)
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Ensures the user is an active admin of the organisation identified by slug.
 */
export async function requireOrgAdmin(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
): Promise<RequireOrgAdminResult> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("organisations.slug", slug)
    .maybeSingle();

  if (error || !data) {
    return { membership: null, error: "Forbidden" };
  }

  const membership = normaliseMembershipRow(data);

  if (!membership || !isOrgAdminMembership(membership)) {
    return { membership: null, error: "Forbidden" };
  }

  return { membership, error: null };
}
