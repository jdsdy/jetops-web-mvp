import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const API_LOG_SERVICE = "nextjs";

export type ApiLogContext = {
  userId?: string | null;
  organisationId?: string | null;
};

export type ApiLogInsert = {
  service: string;
  method: string;
  path: string;
  status_code: number;
  user_id: string | null;
  organisation_id: string | null;
  duration_ms: number;
  error_message: string | null;
};

export type ApiLogContextManager = {
  set: (context: ApiLogContext) => void;
};

type ApiLogWriter = (insert: ApiLogInsert) => Promise<void>;

/**
 * Resolves the API route path to store in api_logs.path.
 */
export function resolveApiLogPath(request: Request): string {
  const path = new URL(request.url).pathname;

  if (!path.startsWith("/api")) {
    throw new Error("API log path must start with /api");
  }

  return path;
}

/**
 * Extracts an organisation id from organisation-scoped API route paths.
 */
export function parseOrganisationIdFromApiPath(path: string): string | null {
  const match = path.match(/^\/api\/organisations\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Reads the JSON error field from failed API responses without logging success bodies.
 */
export async function extractApiLogErrorMessage(
  response: Response,
): Promise<string | null> {
  if (response.status < 400) {
    return null;
  }

  try {
    const body = (await response.clone().json()) as { error?: unknown };

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error.trim();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Builds the row payload for api_logs from request/response metadata.
 */
export function buildApiLogInsert(params: {
  request: Request;
  response: Response;
  durationMs: number;
  userId?: string | null;
  organisationId?: string | null;
  errorMessage?: string | null;
}): ApiLogInsert {
  const path = resolveApiLogPath(params.request);

  return {
    service: API_LOG_SERVICE,
    method: params.request.method.toUpperCase(),
    path,
    status_code: params.response.status,
    user_id: params.userId ?? null,
    organisation_id:
      params.organisationId ?? parseOrganisationIdFromApiPath(path),
    duration_ms: params.durationMs,
    error_message: params.errorMessage ?? null,
  };
}

/**
 * Persists an API interaction to api_logs.
 */
export async function writeApiLog(
  insert: ApiLogInsert,
  writeLog: ApiLogWriter = defaultWriteApiLog,
): Promise<void> {
  try {
    await writeLog(insert);
  } catch (error) {
    console.error(
      "Failed to write API log:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * Wraps an internal Next.js API handler and logs the interaction to api_logs.
 */
export async function withApiLogging(
  request: Request,
  handler: (logContext: ApiLogContextManager) => Promise<Response>,
  writeLog: ApiLogWriter = defaultWriteApiLog,
): Promise<Response> {
  const startedAt = Date.now();
  const context: ApiLogContext = {};
  const logContext: ApiLogContextManager = {
    set(nextContext) {
      Object.assign(context, nextContext);
    },
  };

  let response: Response;
  let thrownError: Error | null = null;

  try {
    response = await handler(logContext);
  } catch (error) {
    thrownError = error instanceof Error ? error : new Error(String(error));
    response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const errorMessage =
    thrownError?.message ?? (await extractApiLogErrorMessage(response));

  await writeApiLog(
    buildApiLogInsert({
      request,
      response,
      durationMs: Date.now() - startedAt,
      userId: context.userId,
      organisationId: context.organisationId,
      errorMessage,
    }),
    writeLog,
  );

  return response;
}

async function defaultWriteApiLog(insert: ApiLogInsert): Promise<void> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("api_logs").insert(insert);

  if (error) {
    throw new Error(error.message);
  }
}
