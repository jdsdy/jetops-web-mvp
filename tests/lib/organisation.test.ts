import { describe, expect, it, vi } from "vitest";

import {
  acceptOrganisationInvitationAtomic,
  assertMemberChangeAllowed,
  assertMemberEnableAllowed,
  assertOwnershipTransferAllowed,
  formatMemberDisplayName,
  getOrganisationRedirect,
  isInvitationAcceptable,
  getMemberAccessBadgeLabel,
  isOrgAdminMembership,
  isSupabaseTransientError,
  normaliseInviteEmail,
  normaliseOrganisationId,
  organisationNameToSlug,
  resolveOrganisationCallbackRedirect,
  validateInvitePayload,
  validateInvitationForConsume,
  validateMemberUpdatePayload,
  validateOrganisationName,
} from "@/lib/organisation";

describe("normaliseOrganisationId", () => {
  it("returns a lowercase uuid", () => {
    expect(normaliseOrganisationId(" 11111111-1111-4111-8111-111111111111 ")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("returns null for slug-like route segments", () => {
    expect(normaliseOrganisationId("jet-operations")).toBeNull();
  });
});

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

describe("normaliseInviteEmail", () => {
  it("trims and lowercases email addresses", () => {
    expect(normaliseInviteEmail("  Pilot@Example.COM ")).toBe("pilot@example.com");
  });
});

const validConsumeInvitation = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "pilot@example.com",
  invited_user_id: "user-1",
  organisation_id: "org-1",
  expires_at: "2027-06-06T12:00:00Z",
  accepted_at: null,
};

describe("validateInvitationForConsume", () => {
  it("accepts a valid invitation for the verified user", () => {
    expect(
      validateInvitationForConsume({
        invitation: validConsumeInvitation,
        hasPendingMembership: true,
        verifiedUserId: "user-1",
        verifiedUserEmail: "pilot@example.com",
        now,
      }),
    ).toBe(true);
  });

  it("rejects when the invitation email does not match", () => {
    expect(
      validateInvitationForConsume({
        invitation: validConsumeInvitation,
        hasPendingMembership: true,
        verifiedUserId: "user-1",
        verifiedUserEmail: "other@example.com",
        now,
      }),
    ).toBe(false);
  });

  it("rejects when there is no pending membership", () => {
    expect(
      validateInvitationForConsume({
        invitation: validConsumeInvitation,
        hasPendingMembership: false,
        verifiedUserId: "user-1",
        verifiedUserEmail: "pilot@example.com",
        now,
      }),
    ).toBe(false);
  });

  it("rejects when the invitation has expired", () => {
    expect(
      validateInvitationForConsume({
        invitation: {
          ...validConsumeInvitation,
          expires_at: "2026-06-04T12:00:00Z",
        },
        hasPendingMembership: true,
        verifiedUserId: "user-1",
        verifiedUserEmail: "pilot@example.com",
        now,
      }),
    ).toBe(false);
  });
});

describe("acceptOrganisationInvitationAtomic", () => {
  it("calls the atomic accept RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const adminClient = { rpc } as never;

    const result = await acceptOrganisationInvitationAtomic(
      adminClient,
      "11111111-1111-4111-8111-111111111111",
      "user-1",
    );

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("accept_organisation_invitation_atomic", {
      p_invitation_id: "11111111-1111-4111-8111-111111111111",
      p_user_id: "user-1",
    });
  });
});

describe("isSupabaseTransientError", () => {
  it("returns true for network-style errors", () => {
    expect(isSupabaseTransientError({ message: "fetch failed" })).toBe(true);
    expect(isSupabaseTransientError({ message: "Network timeout" })).toBe(true);
  });

  it("returns false for definitive validation errors", () => {
    expect(
      isSupabaseTransientError({ message: "Invitation is no longer valid" }),
    ).toBe(false);
  });

  it("returns false for null errors", () => {
    expect(isSupabaseTransientError(null)).toBe(false);
  });
});

describe("getOrganisationRedirect", () => {
  it("sends users without membership to setup", () => {
    expect(getOrganisationRedirect(null)).toBe("/app/organisation/setup");
  });

  it("sends users with membership to their organisation app route", () => {
    expect(
      getOrganisationRedirect({
        organisations: { id: "org-1", name: "Jet Operations", slug: "jet-operations" },
      }),
    ).toBe("/app/organisation/org-1");
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

describe("getMemberAccessBadgeLabel", () => {
  it("returns owner for owners even when they are also admin", () => {
    expect(
      getMemberAccessBadgeLabel({ is_owner: true, is_admin: true }),
    ).toBe("owner");
  });

  it("returns admin for non-owner admins", () => {
    expect(
      getMemberAccessBadgeLabel({ is_owner: false, is_admin: true }),
    ).toBe("admin");
  });

  it("returns member for regular members", () => {
    expect(
      getMemberAccessBadgeLabel({ is_owner: false, is_admin: false }),
    ).toBe("member");
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

  it("rejects direct is_owner updates", () => {
    expect(validateMemberUpdatePayload({ is_owner: true })).toEqual({
      valid: false,
      error: "Use the ownership transfer endpoint to change ownership",
    });
  });
});

describe("assertMemberChangeAllowed", () => {
  const targetMember = {
    id: "member-1",
    user_id: "user-1",
    display_name: "Jane S",
    role: "pilot",
    status: "active",
    is_admin: true,
    is_owner: false,
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

  it("rejects re-enabling a disabled member via patch", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "admin-1",
        targetMember: { ...targetMember, status: "disabled" },
        activeAdminCount: 2,
        patch: { status: "active" },
      }),
    ).toEqual({
      allowed: false,
      error: "Use POST to re-enable a disabled member",
    });
  });

  it("rejects deactivating the organisation owner", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "admin-1",
        targetMember: { ...targetMember, is_owner: true },
        activeAdminCount: 2,
        patch: { status: "disabled" },
      }),
    ).toEqual({
      allowed: false,
      error: "Cannot change the organisation owner's permissions",
    });
  });

  it("rejects demoting the organisation owner", () => {
    expect(
      assertMemberChangeAllowed({
        actorUserId: "admin-1",
        targetMember: { ...targetMember, is_owner: true },
        activeAdminCount: 2,
        patch: { is_admin: false },
      }),
    ).toEqual({
      allowed: false,
      error: "Cannot change the organisation owner's permissions",
    });
  });
});

describe("assertOwnershipTransferAllowed", () => {
  const ownerMember = {
    id: "owner-1",
    user_id: "owner-user",
    display_name: "Owner S",
    role: "admin",
    status: "active",
    is_admin: true,
    is_owner: true,
  };

  const targetMember = {
    id: "member-2",
    user_id: "user-2",
    display_name: "Jane S",
    role: "pilot",
    status: "active",
    is_admin: false,
    is_owner: false,
  };

  it("allows the owner to transfer ownership to an active member", () => {
    expect(
      assertOwnershipTransferAllowed({
        actorMember: ownerMember,
        targetMember,
      }),
    ).toEqual({ allowed: true });
  });

  it("rejects transfer from a non-owner admin", () => {
    expect(
      assertOwnershipTransferAllowed({
        actorMember: { ...ownerMember, is_owner: false },
        targetMember,
      }),
    ).toEqual({
      allowed: false,
      error: "Only the organisation owner can transfer ownership",
    });
  });

  it("rejects transfer to a disabled member", () => {
    expect(
      assertOwnershipTransferAllowed({
        actorMember: ownerMember,
        targetMember: { ...targetMember, status: "disabled" },
      }),
    ).toEqual({
      allowed: false,
      error: "Ownership can only be transferred to an active member",
    });
  });

  it("rejects transfer to the current owner", () => {
    expect(
      assertOwnershipTransferAllowed({
        actorMember: ownerMember,
        targetMember: { ...ownerMember, id: "owner-1" },
      }),
    ).toEqual({
      allowed: false,
      error: "Member is already the organisation owner",
    });
  });
});

describe("assertMemberEnableAllowed", () => {
  it("allows enabling a disabled member", () => {
    expect(
      assertMemberEnableAllowed({
        targetMember: {
          id: "member-1",
          user_id: "user-1",
          display_name: "Jane S",
          role: "pilot",
          status: "disabled",
          is_admin: false,
          is_owner: false,
        },
      }),
    ).toEqual({ allowed: true });
  });

  it("rejects enabling a member who is not disabled", () => {
    expect(
      assertMemberEnableAllowed({
        targetMember: {
          id: "member-1",
          user_id: "user-1",
          display_name: "Jane S",
          role: "pilot",
          status: "active",
          is_admin: false,
          is_owner: false,
        },
      }),
    ).toEqual({
      allowed: false,
      error: "Member is not disabled",
    });
  });
});

describe("resolveOrganisationCallbackRedirect", () => {
  const activeMembership = {
    role: "pilot",
    is_admin: false,
    is_owner: false,
    status: "active",
    organisations: {
      id: "org-1",
      name: "Jet Operations",
      slug: "jet-operations",
    },
  };

  it("sends users without membership to setup", () => {
    expect(resolveOrganisationCallbackRedirect(null)).toEqual({
      outcome: "redirect",
      path: "/app/organisation/setup",
    });
  });

  it("signs out disabled members", () => {
    expect(
      resolveOrganisationCallbackRedirect({
        ...activeMembership,
        status: "disabled",
      }),
    ).toEqual({ outcome: "disabled" });
  });

  it("redirects active members to their organisation app route", () => {
    expect(resolveOrganisationCallbackRedirect(activeMembership)).toEqual({
      outcome: "redirect",
      path: "/app/organisation/org-1",
    });
  });

  it("sends pending members to setup", () => {
    expect(
      resolveOrganisationCallbackRedirect({
        ...activeMembership,
        status: "pending",
      }),
    ).toEqual({
      outcome: "redirect",
      path: "/app/organisation/setup",
    });
  });
});
