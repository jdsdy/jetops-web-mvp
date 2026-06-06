import { NextResponse } from "next/server";

import {
  assertMemberChangeAllowed,
  assertMemberEnableAllowed,
  requireOrgAdmin,
  restoreOrganisationMemberAccess,
  revokeOrganisationMemberAccess,
  validateMemberUpdatePayload,
  type OrganisationMember,
} from "@/lib/organisation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MEMBER_SELECT = `
  id,
  user_id,
  display_name,
  role,
  status,
  is_admin,
  is_owner
` as const;

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Loads a single organisation member row using the admin client.
 */
async function loadOrganisationMember(
  organisationId: string,
  memberId: string,
): Promise<OrganisationMember | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("organisation_members")
    .select(MEMBER_SELECT)
    .eq("id", memberId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Counts active admins for guardrail checks before membership changes.
 */
async function countActiveAdmins(organisationId: string): Promise<number> {
  const adminClient = createAdminClient();
  const { count, error } = await adminClient
    .from("organisation_members")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .eq("status", "active")
    .eq("is_admin", true);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

/**
 * Bans a deactivated member from signing in again.
 */
async function applyMemberDeactivationSideEffects(userId: string) {
  const { error } = await revokeOrganisationMemberAccess(userId);

  if (error) {
    return error;
  }

  return null;
}

/**
 * Clears the auth ban when a disabled member is re-enabled.
 */
async function applyMemberEnableSideEffects(userId: string) {
  const { error } = await restoreOrganisationMemberAccess(userId);

  if (error) {
    return error;
  }

  return null;
}

/**
 * Updates an organisation members data (status, role, is_admin).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string; memberId: string }> },
) {
  const { slug, memberId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { membership, error: adminError } = await requireOrgAdmin(
    supabase,
    user.id,
    slug,
  );

  if (adminError || !membership) {
    return jsonError("Forbidden", 403);
  }

  const targetMember = await loadOrganisationMember(
    membership.organisations.id,
    memberId,
  );

  if (!targetMember) {
    return jsonError("Member not found", 404);
  }

  const guard = assertMemberEnableAllowed({ targetMember });

  if (!guard.allowed) {
    return jsonError(guard.error, 400);
  }

  const adminClient = createAdminClient();
  const { data: updatedMember, error: updateError } = await adminClient
    .from("organisation_members")
    .update({ status: "active" })
    .eq("id", memberId)
    .eq("organisation_id", membership.organisations.id)
    .select(MEMBER_SELECT)
    .single();

  if (updateError || !updatedMember) {
    return jsonError(updateError?.message ?? "Failed to enable member", 500);
  }

  const restoreError = await applyMemberEnableSideEffects(updatedMember.user_id);

  if (restoreError) {
    return jsonError(restoreError, 500);
  }

  return Response.json(updatedMember);
}

/**
 * Updates an organisation member's role, status, or admin flag.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; memberId: string }> },
) {
  const { slug, memberId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { membership, error: adminError } = await requireOrgAdmin(
    supabase,
    user.id,
    slug,
  );

  if (adminError || !membership) {
    return jsonError("Forbidden", 403);
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const validation = validateMemberUpdatePayload(body);

  if (!validation.valid) {
    return jsonError(validation.error, 400);
  }

  const targetMember = await loadOrganisationMember(
    membership.organisations.id,
    memberId,
  );

  if (!targetMember) {
    return jsonError("Member not found", 404);
  }

  const activeAdminCount = await countActiveAdmins(membership.organisations.id);
  const guard = assertMemberChangeAllowed({
    actorUserId: user.id,
    targetMember,
    activeAdminCount,
    patch: validation.patch,
  });

  if (!guard.allowed) {
    return jsonError(guard.error, 400);
  }

  const adminClient = createAdminClient();
  const { data: updatedMember, error: updateError } = await adminClient
    .from("organisation_members")
    .update(validation.patch)
    .eq("id", memberId)
    .eq("organisation_id", membership.organisations.id)
    .select(MEMBER_SELECT)
    .single();

  if (updateError || !updatedMember) {
    return jsonError(updateError?.message ?? "Failed to update member", 500);
  }

  if (validation.patch.status === "disabled") {
    const revokeError = await applyMemberDeactivationSideEffects(
      updatedMember.user_id,
    );

    if (revokeError) {
      return jsonError(revokeError, 500);
    }
  }

  return Response.json(updatedMember);
}

/**
 * Deactivates an organisation member by setting status to disabled.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; memberId: string }> },
) {
  const { slug, memberId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { membership, error: adminError } = await requireOrgAdmin(
    supabase,
    user.id,
    slug,
  );

  if (adminError || !membership) {
    return jsonError("Forbidden", 403);
  }

  const targetMember = await loadOrganisationMember(
    membership.organisations.id,
    memberId,
  );

  if (!targetMember) {
    return jsonError("Member not found", 404);
  }

  const activeAdminCount = await countActiveAdmins(membership.organisations.id);
  const guard = assertMemberChangeAllowed({
    actorUserId: user.id,
    targetMember,
    activeAdminCount,
    patch: { status: "disabled" },
  });

  if (!guard.allowed) {
    return jsonError(guard.error, 400);
  }

  const adminClient = createAdminClient();
  const { data: updatedMember, error: updateError } = await adminClient
    .from("organisation_members")
    .update({ status: "disabled" })
    .eq("id", memberId)
    .eq("organisation_id", membership.organisations.id)
    .select(MEMBER_SELECT)
    .single();

  if (updateError || !updatedMember) {
    return jsonError(updateError?.message ?? "Failed to deactivate member", 500);
  }

  const revokeError = await applyMemberDeactivationSideEffects(updatedMember.user_id);

  if (revokeError) {
    return jsonError(revokeError, 500);
  }

  return Response.json(updatedMember);
}
