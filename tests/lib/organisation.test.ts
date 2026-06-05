import { describe, expect, it } from "vitest";

import {
  formatMemberDisplayName,
  getOrganisationPortalRedirect,
  isInvitationAcceptable,
  isOrgAdminMembership,
  organisationNameToSlug,
  validateInvitePayload,
  validateOrganisationName,
} from "@/lib/organisation";

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

describe("formatMemberDisplayName", () => {
  it("joins first name and last initial with a space", () => {
    expect(formatMemberDisplayName("Josh", "S")).toBe("Josh S");
  });

  it("trims whitespace from both parts", () => {
    expect(formatMemberDisplayName("  Josh  ", " S ")).toBe("Josh S");
  });
});

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

describe("validateInvitePayload", () => {
  it("requires an email", () => {
    expect(
      validateInvitePayload({
        email: "",
        fName: "Jane",
        lInitial: "S",
        role: "member",
      }),
    ).toEqual({ valid: false, error: "Email is required" });
  });

  it("requires a first name", () => {
    expect(
      validateInvitePayload({
        email: "jane@example.com",
        fName: "",
        lInitial: "S",
        role: "member",
      }),
    ).toEqual({ valid: false, error: "First name is required" });
  });

  it("requires a role", () => {
    expect(
      validateInvitePayload({
        email: "jane@example.com",
        fName: "Jane",
        lInitial: "S",
        role: "",
      }),
    ).toEqual({ valid: false, error: "Role is required" });
  });

  it("accepts a valid payload", () => {
    expect(
      validateInvitePayload({
        email: "jane@example.com",
        fName: "  Jane  ",
        lInitial: " S ",
        role: "member",
      }),
    ).toEqual({
      valid: true,
      email: "jane@example.com",
      fName: "Jane",
      lInitial: "S",
      role: "member",
    });
  });
});

const now = new Date("2026-06-05T12:00:00Z");

describe("isInvitationAcceptable", () => {
  it("accepts a valid pending invitation for the authenticated user", () => {
    expect(
      isInvitationAcceptable(
        {
          invited_user_id: "user-1",
          expires_at: "2026-06-06T12:00:00Z",
          accepted_at: null,
        },
        "user-1",
        now,
      ),
    ).toBe(true);
  });

  it("rejects when invited_user_id does not match", () => {
    expect(
      isInvitationAcceptable(
        {
          invited_user_id: "user-1",
          expires_at: "2026-06-06T12:00:00Z",
          accepted_at: null,
        },
        "user-2",
        now,
      ),
    ).toBe(false);
  });

  it("rejects when the invitation has expired", () => {
    expect(
      isInvitationAcceptable(
        {
          invited_user_id: "user-1",
          expires_at: "2026-06-04T12:00:00Z",
          accepted_at: null,
        },
        "user-1",
        now,
      ),
    ).toBe(false);
  });

  it("rejects when the invitation was already accepted", () => {
    expect(
      isInvitationAcceptable(
        {
          invited_user_id: "user-1",
          expires_at: "2026-06-06T12:00:00Z",
          accepted_at: "2026-06-05T10:00:00Z",
        },
        "user-1",
        now,
      ),
    ).toBe(false);
  });
});

describe("getOrganisationPortalRedirect", () => {
  it("sends users without membership to setup", () => {
    expect(getOrganisationPortalRedirect(null)).toBe("/portal/organisation/setup");
  });

  it("sends users with membership to their organisation slug route", () => {
    expect(
      getOrganisationPortalRedirect({
        organisations: { id: "1", name: "Jet Operations", slug: "jet-operations" },
      }),
    ).toBe("/portal/organisation/jet-operations");
  });
});

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
