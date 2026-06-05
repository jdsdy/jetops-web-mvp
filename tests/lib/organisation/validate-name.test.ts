import { describe, expect, it } from "vitest";

import { validateOrganisationName } from "@/lib/organisation/validate-name";

describe("validateOrganisationName", () => {
  it("requires a name", () => {
    expect(validateOrganisationName("   ")).toEqual({
      valid: false,
      error: "Organisation name is required",
    });
  });

  it("returns the trimmed name and derived slug", () => {
    expect(validateOrganisationName("  Jet Operations  ")).toEqual({
      valid: true,
      name: "Jet Operations",
      slug: "jet-operations",
    });
  });
});
