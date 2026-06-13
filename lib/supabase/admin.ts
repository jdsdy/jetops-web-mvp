import { createClient } from "@supabase/supabase-js";

/**
 * Resolves the server-only Supabase secret key used for admin operations.
 */
function resolveSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!key?.trim()) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY environment variable for admin Supabase client",
    );
  }

  return key;
}

/**
 * Creates a Supabase client with secret-key access for server-only operations.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    resolveSecretKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
