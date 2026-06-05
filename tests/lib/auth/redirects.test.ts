import { describe, expect, it } from "vitest";

import { getRedirectForProfile } from "@/lib/auth/redirects";

describe("getRedirectForProfile", () => {
  it("sends incomplete profiles to onboarding", () => {
    expect(
      getRedirectForProfile({
        f_name: "",
        l_initial: "",
        account_type: "organisation",
      }),
    ).toBe("/onboarding");
  });

  it("sends completed organisation profiles to the organisation portal", () => {
    expect(
      getRedirectForProfile({
        f_name: "Jane",
        l_initial: "S",
        account_type: "organisation",
      }),
    ).toBe("/portal/organisation");
  });

  it("sends completed personal profiles to the personal app", () => {
    expect(
      getRedirectForProfile({
        f_name: "Jane",
        l_initial: "S",
        account_type: "personal",
      }),
    ).toBe("/app/personal");
  });
});
