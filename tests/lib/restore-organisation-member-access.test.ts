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
  ENABLED_MEMBER_BAN_DURATION,
  restoreOrganisationMemberAccess,
} from "@/lib/organisation";

describe("restoreOrganisationMemberAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null });
  });

  it("clears the auth ban for a re-enabled member", async () => {
    const userId = "c4b4a834-975a-470a-91f2-2ee2debf1531";

    const result = await restoreOrganisationMemberAccess(userId);

    expect(result).toEqual({ error: null });
    expect(mockUpdateUserById).toHaveBeenCalledWith(userId, {
      ban_duration: ENABLED_MEMBER_BAN_DURATION,
    });
  });

  it("returns the unban error when updateUserById fails", async () => {
    mockUpdateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "Failed to unban user" },
    });

    const result = await restoreOrganisationMemberAccess(
      "c4b4a834-975a-470a-91f2-2ee2debf1531",
    );

    expect(result).toEqual({ error: "Failed to unban user" });
  });
});
