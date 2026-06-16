import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import { clearInviteIdCookie, getInviteIdCookie } from "@/lib/invite-cookie";
import {
  consumeOrganisationInvite,
  INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE,
  INVITE_TRANSIENT_ERROR_MESSAGE,
  loadProfileHasSetPassword,
} from "@/lib/organisation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAccessToken } from "@/lib/supabase/server";

type ConsumeCookieBody = {
  access_token?: string;
};

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Consumes a pending invite cookie after sign-in, accepting the invitation when valid.
 */
export async function POST(request: Request) {
  return withApiLogging(request, async (logContext) => {
    let body: ConsumeCookieBody;

    try {
      body = (await request.json()) as ConsumeCookieBody;
    } catch {
      await clearInviteIdCookie();
      return jsonError(INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE, 401);
    }

    const accessToken = body.access_token?.trim();

    if (!accessToken) {
      await clearInviteIdCookie();
      return jsonError(INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE, 401);
    }

    const verifiedUser = await verifyAccessToken(accessToken);

    if (!verifiedUser) {
      await clearInviteIdCookie();
      return jsonError(INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE, 401);
    }

    logContext.set({ userId: verifiedUser.id });

    const inviteId = await getInviteIdCookie();
    const adminClient = createAdminClient();

    if (!inviteId) {
      const hasSetPassword = await loadProfileHasSetPassword(adminClient, verifiedUser.id);

      if (hasSetPassword === null) {
        return jsonError(INVITE_TRANSIENT_ERROR_MESSAGE, 503);
      }

      return NextResponse.json({ ok: true, has_set_password: hasSetPassword });
    }

    const result = await consumeOrganisationInvite(
      adminClient,
      verifiedUser,
      inviteId,
    );

    if (result.outcome === "transient") {
      return jsonError(INVITE_TRANSIENT_ERROR_MESSAGE, 503);
    }

    if (result.outcome === "invalid") {
      await clearInviteIdCookie();
      return jsonError(INVITE_EXPIRED_CONTACT_ADMIN_MESSAGE, 400);
    }

    await clearInviteIdCookie();

    return NextResponse.json({
      ok: true,
      has_set_password: result.hasSetPassword,
    });
  });
}
