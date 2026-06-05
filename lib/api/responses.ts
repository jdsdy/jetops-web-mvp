import { NextResponse } from "next/server";

/**
 * Returns a JSON error response with the given status code.
 */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
