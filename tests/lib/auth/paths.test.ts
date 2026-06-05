import { describe, expect, it } from "vitest";

import { getPostOnboardingPath } from "@/lib/auth/paths";

describe("getPostOnboardingPath", () => {
  it("redirects organisation accounts to the organisation portal", () => {
    expect(getPostOnboardingPath("organisation")).toBe("/portal/organisation");
  });

  it("redirects personal accounts to the personal app", () => {
    expect(getPostOnboardingPath("personal")).toBe("/app/personal");
  });

  it("falls back to onboarding when account type is unknown", () => {
    expect(getPostOnboardingPath("unknown")).toBe("/onboarding");
  });
});
