import { describe, expect, it } from "vitest";

import { isInvitationAcceptable } from "@/lib/organisation/validate-invitation";

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
