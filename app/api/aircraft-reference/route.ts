import { NextResponse } from "next/server";

import { withApiLogging } from "@/lib/api-logging";
import { groupAircraftReferenceByManufacturer } from "@/lib/fleet";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a JSON error response with the given HTTP status.
 */
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Lists aircraft reference data grouped by manufacturer for dropdown menus.
 */
export async function GET(request: Request) {
  return withApiLogging(request, async (logContext) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    logContext.set({ userId: user.id });

    const { data, error } = await supabase
      .from("aircraft_reference")
      .select("id, manufacturer, model")
      .order("manufacturer", { ascending: true })
      .order("model", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json(groupAircraftReferenceByManufacturer(data ?? []));
  });
}
