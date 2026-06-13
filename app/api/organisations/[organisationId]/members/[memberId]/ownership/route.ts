import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  assertOwnershipTransferAllowed,
  requireOrgAdmin,
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
 * Loads the caller's organisation membership row using the admin client.
 */
async function loadOrganisationMemberByUserId(
  organisationId: string,
  userId: string,
): Promise<OrganisationMember | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("organisation_members")
    .select(MEMBER_SELECT)
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Transfers organisation ownership to another active member.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ organisationId: string; memberId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId, memberId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    logContext.set({ userId: user.id });

    const { membership, error: adminError } = await requireOrgAdmin(
      supabase,
      user.id,
      organisationId,
    );

    if (adminError || !membership) {
      return jsonError("Forbidden", 403);
    }

    logContext.set({ organisationId: membership.organisations.id });

    const actorMember = await loadOrganisationMemberByUserId(organisationId, user.id);
    const targetMember = await loadOrganisationMember(organisationId, memberId);

    if (!actorMember || !targetMember) {
      return jsonError("Member not found", 404);
    }

    const guard = assertOwnershipTransferAllowed({
      actorMember,
      targetMember,
    });

    if (!guard.allowed) {
      return jsonError(guard.error, 400);
    }

    const adminClient = createAdminClient();
    const { error: transferError } = await adminClient.rpc(
      "transfer_organisation_ownership",
      {
        p_organisation_id: organisationId,
        p_current_owner_member_id: actorMember.id,
        p_target_member_id: targetMember.id,
      },
    );

    if (transferError) {
      return jsonError(transferError.message, 500);
    }

    const updatedTargetMember = await loadOrganisationMember(
      organisationId,
      memberId,
    );

    if (!updatedTargetMember) {
      return jsonError("Failed to load updated member", 500);
    }

    return Response.json(updatedTargetMember);
  });
}
