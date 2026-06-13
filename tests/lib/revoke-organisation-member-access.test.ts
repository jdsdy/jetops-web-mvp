import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateUserById = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}));

import {
  DISABLED_MEMBER_BAN_DURATION,
  revokeOrganisationMemberAccess,
} from "@/lib/organisation";

describe("revokeOrganisationMemberAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null });
  });

  it("bans the user without attempting session revocation", async () => {
    const userId = "c4b4a834-975a-470a-91f2-2ee2debf1531";

    const result = await revokeOrganisationMemberAccess(userId);

    expect(result).toEqual({ error: null });
    expect(mockUpdateUserById).toHaveBeenCalledWith(userId, {
      ban_duration: DISABLED_MEMBER_BAN_DURATION,
    });
    expect(mockUpdateUserById).toHaveBeenCalledTimes(1);
  });

  it("returns the ban error when updateUserById fails", async () => {
    mockUpdateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "Failed to ban user" },
    });

    const result = await revokeOrganisationMemberAccess(
      "c4b4a834-975a-470a-91f2-2ee2debf1531",
    );

    expect(result).toEqual({ error: "Failed to ban user" });
  });
});
