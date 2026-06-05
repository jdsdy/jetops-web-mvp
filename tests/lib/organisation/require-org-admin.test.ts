import { describe, expect, it } from "vitest";

import { isOrgAdminMembership } from "@/lib/organisation/require-org-admin";

describe("isOrgAdminMembership", () => {
  it("returns true for an active admin membership", () => {
    expect(
      isOrgAdminMembership({
        is_admin: true,
        status: "active",
      }),
    ).toBe(true);
  });

  it("returns false for a non-admin membership", () => {
    expect(
      isOrgAdminMembership({
        is_admin: false,
        status: "active",
      }),
    ).toBe(false);
  });

  it("returns false for a pending admin membership", () => {
    expect(
      isOrgAdminMembership({
        is_admin: true,
        status: "pending",
      }),
    ).toBe(false);
  });
});
