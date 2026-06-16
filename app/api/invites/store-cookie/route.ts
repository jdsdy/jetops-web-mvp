import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  getInviteIdCookie,
  setInviteIdCookie,
} from "@/lib/invite-cookie";
import { INVITATION_INVALID_MESSAGE } from "@/lib/organisation";
import { createAdminClient } from "@/lib/supabase/admin";

type StoreCookieBody = {
  token?: string;
};

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Validates an invitation token and stores it in an HttpOnly cookie.
 */
export async function POST(request: Request) {
  return withApiLogging(request, async () => {
    if (await getInviteIdCookie()) {
      return NextResponse.json({ ok: true });
    }

    let body: StoreCookieBody;

    try {
      body = (await request.json()) as StoreCookieBody;
    } catch {
      return jsonError(INVITATION_INVALID_MESSAGE, 400);
    }

    const token = body.token?.trim();

    if (!token) {
      return jsonError(INVITATION_INVALID_MESSAGE, 400);
    }

    const adminClient = createAdminClient();
    const { data: invitation, error } = await adminClient
      .from("organisation_invitations")
      .select("id, expires_at, accepted_at")
      .eq("id", token)
      .maybeSingle();

    if (error) {
      return jsonError(INVITATION_INVALID_MESSAGE, 400);
    }

    if (
      !invitation ||
      invitation.accepted_at !== null ||
      new Date(invitation.expires_at) <= new Date()
    ) {
      return jsonError(INVITATION_INVALID_MESSAGE, 404);
    }

    await setInviteIdCookie(invitation.id);

    return NextResponse.json({ ok: true });
  });
}
