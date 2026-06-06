import { NextResponse } from "next/server";

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
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
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

  const members = await getListedOrganisationMembers(
    supabase,
    membership.organisations.id,
  );

  return Response.json(members);
}
