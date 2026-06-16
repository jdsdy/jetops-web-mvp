import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import { getSiteUrl } from "@/lib/env";
import {
  formatMemberDisplayName,
  getInviteExpiryDate,
  requireOrgAdmin,
  validateInvitePayload,
} from "@/lib/organisation";
import { generateTemporaryPassword } from "@/lib/password";
import { sendOrganisationInviteEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type InviteRequestBody = {
  email?: string;
  fName?: string;
  f_name?: string;
  lInitial?: string;
  l_initial?: string;
  role?: string;
};

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function markInviteeNeedsPassword(userId: string) {
  const adminClient = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      const { error } = await adminClient
        .from("profiles")
        .update({ has_set_password: false })
        .eq("id", userId);

      return { error: error?.message ?? null };
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { error: "Profile not found" };
}

/**
 * Lists pending organisation invitations for the current admin.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId } = await context.params;
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
    const { data, error } = await adminClient
      .from("organisation_invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("organisation_id", membership.organisations.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json(data ?? []);
  });
}

/**
 * Sends an organisation invite and creates invitation plus pending membership records.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ organisationId: string }> },
) {
  return withApiLogging(request, async (logContext) => {
    const { organisationId } = await context.params;
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

    let body: InviteRequestBody;

    try {
      body = (await request.json()) as InviteRequestBody;
    } catch {
      return jsonError("Invalid request body", 400);
    }

    const validation = validateInvitePayload({
      email: String(body.email ?? ""),
      fName: String(body.fName ?? body.f_name ?? ""),
      lInitial: String(body.lInitial ?? body.l_initial ?? ""),
      role: String(body.role ?? ""),
    });

    if (!validation.valid) {
      return jsonError(validation.error, 400);
    }

    const adminClient = createAdminClient();
    const temporaryPassword = generateTemporaryPassword(10);
    const { data: invitedUser, error: inviteError } =
      await adminClient.auth.admin.createUser({
        email: validation.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          account_type: "organisation",
          f_name: validation.fName,
          l_initial: validation.lInitial,
          role: validation.role,
          organisation_id: membership.organisations.id,
          organisation_slug: membership.organisations.slug,
          organisation_name: membership.organisations.name,
        },
      });

    if (inviteError || !invitedUser.user) {
      return jsonError(inviteError?.message ?? "Failed to send invite", 500);
    }

    const profileError = await markInviteeNeedsPassword(invitedUser.user.id);

    if (profileError.error) {
      return jsonError(profileError.error, 500);
    }

    const { data: invitationId, error: recordsError } = await adminClient.rpc(
      "create_organisation_invite_records",
      {
        p_organisation_id: membership.organisations.id,
        p_user_id: invitedUser.user.id,
        p_email: validation.email,
        p_role: validation.role,
        p_invited_by: user.id,
        p_display_name: formatMemberDisplayName(validation.fName, validation.lInitial),
        p_expires_at: getInviteExpiryDate().toISOString(),
      },
    );

    if (recordsError || !invitationId) {
      return jsonError(recordsError?.message ?? "Failed to create invite records", 500);
    }

    const inviteUrl = `${getSiteUrl()}/auth/accept-invite?token=${invitationId}`;
    const { error: emailError } = await sendOrganisationInviteEmail({
      to: validation.email,
      organisationName: membership.organisations.name,
      temporaryPassword,
      inviteUrl,
    });

    if (emailError) {
      return jsonError(emailError, 500);
    }

    return Response.json(
      {
        userId: invitedUser.user.id,
        email: validation.email,
        invitationId,
      },
      { status: 201 },
    );
  });
}
