import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import { requireOrgAdmin } from "@/lib/organisation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Cancels a pending organisation invitation and removes the pending membership row.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ organisationId: string; inviteId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId, inviteId } = await context.params;
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

    const adminClient = createAdminClient();
    const { data: invitation, error: inviteError } = await adminClient
      .from("organisation_invitations")
      .select("id, invited_user_id")
      .eq("id", inviteId)
      .eq("organisation_id", membership.organisations.id)
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError) {
      return jsonError(inviteError.message, 500);
    }

    if (!invitation) {
      return jsonError("Invite not found", 404);
    }

    const { error: deleteInviteError } = await adminClient
      .from("organisation_invitations")
      .delete()
      .eq("id", inviteId);

    if (deleteInviteError) {
      return jsonError(deleteInviteError.message, 500);
    }

    const { error: deleteMemberError } = await adminClient
      .from("organisation_members")
      .delete()
      .eq("organisation_id", membership.organisations.id)
      .eq("user_id", invitation.invited_user_id)
      .eq("status", "pending");

    if (deleteMemberError) {
      return jsonError(deleteMemberError.message, 500);
    }

    return new Response(null, { status: 204 });
  });
}
