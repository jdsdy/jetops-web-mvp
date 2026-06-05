import { describe, expect, it } from "vitest";

import { ACCOUNT_TYPES, isValidAccountType } from "@/lib/auth/account-types";

describe("isValidAccountType", () => {
  it("accepts organisation", () => {
    expect(isValidAccountType("organisation")).toBe(true);
  });

  it("accepts personal", () => {
    expect(isValidAccountType("personal")).toBe(true);
  });

  it("rejects unknown account types", () => {
    expect(isValidAccountType("business")).toBe(false);
    expect(isValidAccountType("")).toBe(false);
  });

  it("exposes the supported account types", () => {
    expect(ACCOUNT_TYPES).toEqual(["organisation", "personal"]);
  });
});
