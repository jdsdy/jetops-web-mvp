import { describe, expect, it } from "vitest";

import {
  assertMemberChangeAllowed,
  formatMemberDisplayName,
  getOrganisationPortalRedirect,
  isInvitationAcceptable,
  isOrgAdminMembership,
  organisationNameToSlug,
  validateInvitePayload,
  validateMemberUpdatePayload,
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

describe("validateMemberUpdatePayload", () => {
  it("requires at least one field", () => {
    expect(validateMemberUpdatePayload({})).toEqual({
      valid: false,
      error: "At least one field is required",
    });
  });

  it("rejects an empty role", () => {
    expect(validateMemberUpdatePayload({ role: "   " })).toEqual({
      valid: false,
      error: "Role is required",
    });
  });

  it("rejects an invalid status", () => {
    expect(validateMemberUpdatePayload({ status: "removed" })).toEqual({
      valid: false,
      error: "Status is invalid",
    });
  });

  it("accepts a partial update with trimmed role", () => {
    expect(validateMemberUpdatePayload({ role: "  pilot  " })).toEqual({
      valid: true,
      patch: { role: "pilot" },
    });
  });

  it("accepts status and is_admin updates", () => {
    expect(
      validateMemberUpdatePayload({ status: "disabled", is_admin: true }),
    ).toEqual({
      valid: true,
      patch: { status: "disabled", is_admin: true },
    });
  });
});

describe("assertMemberChangeAllowed", () => {
  const targetMember = {
    id: 1,
    user_id: "user-1",
    display_name: "Jane S",
    role: "pilot",
    status: "active",
    is_admin: true,
  };

  it("allows updating another member", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "admin-1",
        targetMember,
        activeAdminCount: 2,
        patch: { role: "captain" },
      }),
    ).toEqual({ allowed: true });
  });

  it("rejects self deactivation", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "user-1",
        targetMember,
        activeAdminCount: 2,
        patch: { status: "disabled" },
      }),
    ).toEqual({
      allowed: false,
      error: "You cannot change your own membership",
    });
  });

  it("rejects self admin demotion", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "user-1",
        targetMember,
        activeAdminCount: 2,
        patch: { is_admin: false },
      }),
    ).toEqual({
      allowed: false,
      error: "You cannot change your own membership",
    });
  });

  it("rejects deactivating the last active admin", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "admin-1",
        targetMember,
        activeAdminCount: 1,
        patch: { status: "disabled" },
      }),
    ).toEqual({
      allowed: false,
      error: "Cannot remove the last active admin",
    });
  });

  it("rejects demoting the last active admin", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "admin-1",
        targetMember,
        activeAdminCount: 1,
        patch: { is_admin: false },
      }),
    ).toEqual({
      allowed: false,
      error: "Cannot remove the last active admin",
    });
  });
});
