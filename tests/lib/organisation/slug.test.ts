import { describe, expect, it } from "vitest";

import { organisationNameToSlug } from "@/lib/organisation/slug";

describe("organisationNameToSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(organisationNameToSlug("Jet Operations")).toBe("jet-operations");
  });

  it("trims whitespace before slugifying", () => {
    expect(organisationNameToSlug("  jet charter co  ")).toBe("jet-charter-co");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    expect(organisationNameToSlug("jet   operations")).toBe("jet-operations");
  });

  it("removes characters that are not letters, numbers, or spaces", () => {
    expect(organisationNameToSlug("Jet & Charter Co!")).toBe("jet-charter-co");
  });
});
