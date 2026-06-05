import { describe, expect, it } from "vitest";

import { getOrganisationPortalRedirect } from "@/lib/organisation/portal-redirect";

describe("getOrganisationPortalRedirect", () => {
  it("sends users without membership to setup", () => {
    expect(getOrganisationPortalRedirect(null)).toBe("/portal/organisation/setup");
  });

  it("sends users with membership to their organisation slug route", () => {
    expect(
      getOrganisationPortalRedirect({
        organisations: { slug: "jet-operations" },
      }),
    ).toBe("/portal/organisation/jet-operations");
  });
});
