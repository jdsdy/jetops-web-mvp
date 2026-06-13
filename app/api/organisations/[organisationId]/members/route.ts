import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import {
  getListedOrganisationMembers,
  requireOrgAdmin,
} from "@/lib/organisation";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Lists active and disabled organisation members for the current admin.
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

    const members = await getListedOrganisationMembers(
      supabase,
      membership.organisations.id,
    );

    return Response.json(members);
  });
}
