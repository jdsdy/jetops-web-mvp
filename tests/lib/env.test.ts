import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPasswordResetRedirectUrl } from "@/lib/env";

describe("getPasswordResetRedirectUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.jetops.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the confirm route used for password reset email links", () => {
    expect(getPasswordResetRedirectUrl()).toBe(
      "https://app.jetops.test/auth/confirm?next=/auth/update-password",
    );
  });
});
