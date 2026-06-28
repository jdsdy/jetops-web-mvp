import { describe, expect, it, vi } from "vitest";

import {
  getPersonalAppPath,
  getPersonalFlightsAnalysisPath,
  requirePersonalAccount,
  resolvePersonalRouteAccess,
} from "@/lib/personal";

describe("getPersonalAppPath", () => {
  it("returns the personal app home path", () => {
    expect(getPersonalAppPath()).toBe("/app/personal");
  });
});

describe("getPersonalFlightsAnalysisPath", () => {
  it("builds the analysis page URL with flight and job ids", () => {
    expect(
      getPersonalFlightsAnalysisPath(
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ),
    ).toBe(
      "/app/personal/flights?id=22222222-2222-4222-8222-222222222222&jobId=33333333-3333-4333-8333-333333333333",
    );
  });
});

describe("requirePersonalAccount", () => {
  it("returns the profile when account type is personal", async () => {
    const profile = {
      id: "user-1",
      f_name: "Jane",
      l_initial: "S",
      account_type: "personal",
    };

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
          }),
        }),
      }),
    };

    const result = await requirePersonalAccount(
      supabase as never,
      "user-1",
    );

    expect(result).toEqual({ profile, error: null });
  });

  it("returns forbidden when account type is organisation", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-1",
                f_name: "Jane",
                l_initial: "S",
                account_type: "organisation",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await requirePersonalAccount(
      supabase as never,
      "user-1",
    );

    expect(result).toEqual({ profile: null, error: "Forbidden" });
  });

  it("returns forbidden when profile is missing", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };

    const result = await requirePersonalAccount(
      supabase as never,
      "user-1",
    );

    expect(result).toEqual({ profile: null, error: "Forbidden" });
  });
});

describe("resolvePersonalRouteAccess", () => {
  it("allows access for a personal account with completed onboarding", async () => {
    const profile = {
      id: "user-1",
      f_name: "Jane",
      l_initial: "S",
      account_type: "personal",
    };

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
          }),
        }),
      }),
    };

    const result = await resolvePersonalRouteAccess(
      supabase as never,
      "user-1",
    );

    expect(result).toEqual({ outcome: "ok", profile });
  });

  it("redirects organisation users to their account home", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-1",
                f_name: "Jane",
                l_initial: "S",
                account_type: "organisation",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await resolvePersonalRouteAccess(
      supabase as never,
      "user-1",
    );

    expect(result).toEqual({ outcome: "redirect", path: "/app/callback" });
  });

  it("redirects incomplete onboarding to the onboarding page", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "user-1",
                f_name: "",
                l_initial: "",
                account_type: "personal",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const result = await resolvePersonalRouteAccess(
      supabase as never,
      "user-1",
    );

    expect(result).toEqual({ outcome: "redirect", path: "/onboarding" });
  });
});
