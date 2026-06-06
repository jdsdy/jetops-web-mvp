import { afterEach, describe, expect, it, vi } from "vitest";

describe("createAdminClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear error when the secret key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    const { createAdminClient } = await import("@/lib/supabase/admin");

    expect(() => createAdminClient()).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("uses SUPABASE_SECRET_KEY for the admin client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();

    expect(client.supabaseKey).toBe("sb_secret_example");
  });
});
