import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

const MEMBERSHIP_SELECT = `
  role,
  is_admin,
  is_owner,
  status,
  organisations!inner (
    id,
    name,
    slug
  )
` as const;

const MEMBERS_LIST_SELECT = `
  id,
  user_id,
  display_name,
  role,
  status,
  is_admin,
  is_owner
` as const;

const MEMBER_STATUSES = ["active", "pending", "disabled"] as const;

const INVITE_EXPIRY_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORGANISATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const INVITATION_INVALID_MESSAGE = "This invite is no longer valid.";

export type OrganisationMembership = {
  role: string;
  is_admin: boolean;
  is_owner: boolean;
  status: string;
  organisations: {
    id: string;
    name: string;
    slug: string;
  };
};

export type OrganisationMember = {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  status: string;
  is_admin: boolean;
  is_owner: boolean;
};

export type MemberUpdatePatch = {
  role?: string;
  status?: string;
  is_admin?: boolean;
};

type MemberUpdateValidationSuccess = {
  valid: true;
  patch: MemberUpdatePatch;
};

type MemberUpdateValidationFailure = {
  valid: false;
  error: string;
};

export type MemberUpdateValidationResult =
  | MemberUpdateValidationSuccess
  | MemberUpdateValidationFailure;

type MemberChangeAllowedResult =
  | { allowed: true }
  | { allowed: false; error: string };

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
 * Normalises an organisation id from a route or API path segment.
 */
export function normaliseOrganisationId(value: string): string | null {
  const trimmed = value.trim();

  if (!ORGANISATION_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

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
 * Validates a partial organisation member update payload.
 */
export function validateMemberUpdatePayload(
  body: Record<string, unknown>,
): MemberUpdateValidationResult {
  const patch: MemberUpdatePatch = {};

  if ("role" in body) {
    const role = String(body.role ?? "").trim();

    if (!role) {
      return { valid: false, error: "Role is required" };
    }

    patch.role = role;
  }

  if ("status" in body) {
    const status = String(body.status ?? "");

    if (!(MEMBER_STATUSES as readonly string[]).includes(status)) {
      return { valid: false, error: "Status is invalid" };
    }

    patch.status = status;
  }

  if ("is_admin" in body) {
    if (typeof body.is_admin !== "boolean") {
      return { valid: false, error: "is_admin must be a boolean" };
    }

    patch.is_admin = body.is_admin;
  }

  if ("is_owner" in body) {
    return {
      valid: false,
      error: "Use the ownership transfer endpoint to change ownership",
    };
  }

  if (Object.keys(patch).length === 0) {
    return { valid: false, error: "At least one field is required" };
  }

  return { valid: true, patch };
}

/**
 * Returns whether an admin may apply a membership change to the target member.
 */
export function assertMemberChangeAllowed(input: {
  actorUserId: string;
  targetMember: OrganisationMember;
  activeAdminCount: number;
  patch: MemberUpdatePatch;
}): MemberChangeAllowedResult {
  const { actorUserId, targetMember, activeAdminCount, patch } = input;
  const isSelf = targetMember.user_id === actorUserId;
  const removesAdmin =
    patch.status === "disabled" ||
    (patch.is_admin === false && targetMember.is_admin);
  const isLastActiveAdmin =
    targetMember.is_admin &&
    targetMember.status === "active" &&
    activeAdminCount <= 1;

  if (isSelf && (patch.status === "disabled" || patch.is_admin === false)) {
    return {
      allowed: false,
      error: "You cannot change your own membership",
    };
  }

  if (removesAdmin && isLastActiveAdmin) {
    return {
      allowed: false,
      error: "Cannot remove the last active admin",
    };
  }

  if (patch.status === "active" && targetMember.status === "disabled") {
    return {
      allowed: false,
      error: "Use POST to re-enable a disabled member",
    };
  }

  if (
    targetMember.is_owner &&
    (patch.status === "disabled" || patch.is_admin === false)
  ) {
    return {
      allowed: false,
      error: "Cannot change the organisation owner's permissions",
    };
  }

  return { allowed: true };
}

/**
 * Returns whether the organisation owner may transfer ownership to another member.
 */
export function assertOwnershipTransferAllowed(input: {
  actorMember: OrganisationMember;
  targetMember: OrganisationMember;
}): MemberChangeAllowedResult {
  const { actorMember, targetMember } = input;

  if (!actorMember.is_owner) {
    return {
      allowed: false,
      error: "Only the organisation owner can transfer ownership",
    };
  }

  if (actorMember.status !== "active") {
    return {
      allowed: false,
      error: "Only an active owner can transfer ownership",
    };
  }

  if (targetMember.is_owner) {
    return {
      allowed: false,
      error: "Member is already the organisation owner",
    };
  }

  if (targetMember.status !== "active") {
    return {
      allowed: false,
      error: "Ownership can only be transferred to an active member",
    };
  }

  if (actorMember.id === targetMember.id) {
    return {
      allowed: false,
      error: "Cannot transfer ownership to yourself",
    };
  }

  return { allowed: true };
}

/**
 * Returns whether an admin may re-enable a disabled member.
 */
export function assertMemberEnableAllowed(input: {
  targetMember: OrganisationMember;
}): MemberChangeAllowedResult {
  if (input.targetMember.status !== "disabled") {
    return {
      allowed: false,
      error: "Member is not disabled",
    };
  }

  return { allowed: true };
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
 * Returns the portal route for an organisation.
 */
export function getOrganisationPortalPath(organisationId: string): string {
  return `/portal/organisation/${organisationId}`;
}

/**
 * Returns the app route for an organisation.
 */
export function getOrganisationAppPath(organisationId: string): string {
  return `/app/organisation/${organisationId}`;
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

  return getOrganisationPortalPath(membership.organisations.id);
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
  is_owner: boolean;
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
    is_owner: data.is_owner,
    status: data.status,
    organisations: organisation,
  };
}

/**
 * Loads a user's active organisation membership, optionally filtered by organisation id.
 */
export async function getActiveMembership(
  supabase: SupabaseClient,
  userId: string,
  organisationId?: string,
): Promise<OrganisationMembership | null> {
  let query = supabase
    .from("organisation_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("status", "active");

  if (organisationId) {
    const normalisedOrganisationId = normaliseOrganisationId(organisationId);

    if (!normalisedOrganisationId) {
      return null;
    }

    query = query.eq("organisations.id", normalisedOrganisationId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error || !data) {
    return null;
  }

  return normaliseMembershipRow(data);
}

/**
 * Loads active membership for an organisation route, with an unscoped fallback.
 */
export async function requireOrganisationRouteMembership(
  supabase: SupabaseClient,
  userId: string,
  organisationId: string,
): Promise<OrganisationMembership | null> {
  const normalisedOrganisationId = normaliseOrganisationId(organisationId);

  if (!normalisedOrganisationId) {
    return null;
  }

  const scopedMembership = await getActiveMembership(
    supabase,
    userId,
    normalisedOrganisationId,
  );

  if (scopedMembership) {
    return scopedMembership;
  }

  const membership = await getActiveMembership(supabase, userId);

  if (membership?.organisations.id === normalisedOrganisationId) {
    return membership;
  }

  return null;
}

type OrganisationRouteAccess =
  | { outcome: "ok"; membership: OrganisationMembership }
  | { outcome: "redirect"; path: string };

/**
 * Resolves access for an organisation-scoped app route.
 */
export async function resolveOrganisationAppRouteAccess(
  supabase: SupabaseClient,
  userId: string,
  organisationId: string,
): Promise<OrganisationRouteAccess> {
  const membership = await requireOrganisationRouteMembership(
    supabase,
    userId,
    organisationId,
  );

  if (membership) {
    return { outcome: "ok", membership };
  }

  const userMembership = await getUserOrganisationMembership(supabase, userId);

  if (userMembership?.status === "active") {
    return {
      outcome: "redirect",
      path: getOrganisationAppPath(userMembership.organisations.id),
    };
  }

  return {
    outcome: "redirect",
    path: getOrganisationPortalRedirect(userMembership),
  };
}

/**
 * Resolves access for an organisation-scoped portal route.
 */
export async function resolveOrganisationPortalRouteAccess(
  supabase: SupabaseClient,
  userId: string,
  organisationId: string,
): Promise<OrganisationRouteAccess> {
  const membership = await requireOrganisationRouteMembership(
    supabase,
    userId,
    organisationId,
  );

  if (membership) {
    return { outcome: "ok", membership };
  }

  const userMembership = await getUserOrganisationMembership(supabase, userId);

  return {
    outcome: "redirect",
    path: getOrganisationPortalRedirect(userMembership),
  };
}

/**
 * Loads active members for an organisation by organisation ID.
 */
export async function getActiveOrganisationMembers(
  supabase: SupabaseClient,
  organisationId: string,
): Promise<OrganisationMember[]> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(MEMBERS_LIST_SELECT)
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Loads active and disabled members for an organisation by organisation ID.
 */
export async function getListedOrganisationMembers(
  supabase: SupabaseClient,
  organisationId: string,
): Promise<OrganisationMember[]> {
  const { data, error } = await supabase
    .from("organisation_members")
    .select(MEMBERS_LIST_SELECT)
    .eq("organisation_id", organisationId)
    .in("status", ["active", "disabled"])
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
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
 * Resolves where an organisation user should go after the portal callback check.
 */
export function resolveOrganisationCallbackRedirect(
  membership: OrganisationMembership | null,
): { outcome: "disabled" } | { outcome: "redirect"; path: string } {
  if (!membership) {
    return { outcome: "redirect", path: "/portal/organisation/setup" };
  }

  if (membership.status === "disabled") {
    return { outcome: "disabled" };
  }

  if (membership.status === "active") {
    return {
      outcome: "redirect",
      path: getOrganisationPortalPath(membership.organisations.id),
    };
  }

  return { outcome: "redirect", path: "/portal/organisation/setup" };
}

/**
 * Loads a user's organisation membership regardless of status.
 */
export async function getUserOrganisationMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganisationMembership | null> {
  const { data } = await supabase
    .from("organisation_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return normaliseMembershipRow(data);
}

/** Ban duration applied when an organisation member is deactivated. */
export const DISABLED_MEMBER_BAN_DURATION = "876000h";

/** Ban duration applied when an organisation member is re-enabled. */
export const ENABLED_MEMBER_BAN_DURATION = "none";

/**
 * Bans a deactivated organisation member from signing in again.
 */
export async function revokeOrganisationMemberAccess(
  userId: string,
): Promise<{ error: string | null }> {
  const adminClient = createAdminClient();

  const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: DISABLED_MEMBER_BAN_DURATION,
  });

  if (banError) {
    return { error: banError.message };
  }

  return { error: null };
}

/**
 * Clears the auth ban when a disabled organisation member is re-enabled.
 */
export async function restoreOrganisationMemberAccess(
  userId: string,
): Promise<{ error: string | null }> {
  const adminClient = createAdminClient();

  const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: ENABLED_MEMBER_BAN_DURATION,
  });

  if (banError) {
    return { error: banError.message };
  }

  return { error: null };
}

/**
 * Ensures the user is an active admin of the organisation identified by id.
 */
export async function requireOrgAdmin(
  supabase: SupabaseClient,
  userId: string,
  organisationId: string,
): Promise<RequireOrgAdminResult> {
  const normalisedOrganisationId = normaliseOrganisationId(organisationId);

  if (!normalisedOrganisationId) {
    return { membership: null, error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("organisation_members")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("organisations.id", normalisedOrganisationId)
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
