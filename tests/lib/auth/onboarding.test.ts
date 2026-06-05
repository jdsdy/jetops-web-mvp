import { describe, expect, it } from "vitest";

import {
  isOnboardingComplete,
  validateOnboardingFields,
} from "@/lib/auth/onboarding";

describe("validateOnboardingFields", () => {
  it("requires a first name", () => {
    expect(validateOnboardingFields({ fName: "", lInitial: "S" })).toEqual({
      valid: false,
      error: "First name is required",
    });
  });

  it("requires a last name initial", () => {
    expect(validateOnboardingFields({ fName: "Jane", lInitial: "" })).toEqual({
      valid: false,
      error: "Last name initial is required",
    });
  });

  it("accepts trimmed values", () => {
    expect(
      validateOnboardingFields({ fName: "  Jane  ", lInitial: " S " }),
    ).toEqual({ valid: true, fName: "Jane", lInitial: "S" });
  });
});

describe("isOnboardingComplete", () => {
  it("returns false when name fields are empty", () => {
    expect(
      isOnboardingComplete({ f_name: "", l_initial: "", account_type: "personal" }),
    ).toBe(false);
  });

  it("returns true when name fields are populated", () => {
    expect(
      isOnboardingComplete({
        f_name: "Jane",
        l_initial: "S",
        account_type: "personal",
      }),
    ).toBe(true);
  });
});
