import { describe, expect, it } from "vitest";

import {
  ACCOUNT_TYPES,
  canAccessRoute,
  getPostOnboardingPath,
  getRedirectForProfile,
  getRouteGuardRedirect,
  hasInviteAuthParams,
  isAccountTypeProtectedRoute,
  isOnboardingComplete,
  isValidAccountType,
  parseInviteUrl,
  validateOnboardingFields,
} from "@/lib/auth";

describe("isValidAccountType", () => {
  it("accepts organisation", () => {
    expect(isValidAccountType("organisation")).toBe(true);
  });

  it("accepts personal", () => {
    expect(isValidAccountType("personal")).toBe(true);
  });

  it("rejects unknown account types", () => {
    expect(isValidAccountType("business")).toBe(false);
    expect(isValidAccountType("")).toBe(false);
  });

  it("exposes the supported account types", () => {
    expect(ACCOUNT_TYPES).toEqual(["organisation", "personal"]);
  });
});

describe("validateOnboardingFields", () => {
  it("requires a first name", () => {
    expect(validateOnboardingFields({ fName: "", lInitial: "S" })).toEqual({
      valid: false,
      error: "First name is required",
    });
  });

  it("requires a last name initial", () => {
    expect(validateOnboardingFields({ fName: "Jane", lInitial: "" })).toEqual({
      valid: false,
      error: "Last name initial is required",
    });
  });

  it("accepts trimmed values", () => {
    expect(
      validateOnboardingFields({ fName: "  Jane  ", lInitial: " S " }),
    ).toEqual({ valid: true, fName: "Jane", lInitial: "S" });
  });
});

describe("isOnboardingComplete", () => {
  it("returns false when name fields are empty", () => {
    expect(
      isOnboardingComplete({ f_name: "", l_initial: "", account_type: "personal" }),
    ).toBe(false);
  });

  it("returns true when name fields are populated", () => {
    expect(
      isOnboardingComplete({
        f_name: "Jane",
        l_initial: "S",
        account_type: "personal",
      }),
    ).toBe(true);
  });
});

describe("getPostOnboardingPath", () => {
  it("redirects organisation accounts to the organisation portal", () => {
    expect(getPostOnboardingPath("organisation")).toBe("/portal/organisation");
  });

  it("redirects personal accounts to the personal app", () => {
    expect(getPostOnboardingPath("personal")).toBe("/app/personal");
  });

  it("falls back to onboarding when account type is unknown", () => {
    expect(getPostOnboardingPath("unknown")).toBe("/onboarding");
  });
});

describe("getRedirectForProfile", () => {
  it("sends incomplete profiles to onboarding", () => {
    expect(
      getRedirectForProfile({
        f_name: "",
        l_initial: "",
        account_type: "organisation",
      }),
    ).toBe("/onboarding");
  });

  it("sends completed organisation profiles to the organisation portal", () => {
    expect(
      getRedirectForProfile({
        f_name: "Jane",
        l_initial: "S",
        account_type: "organisation",
      }),
    ).toBe("/portal/organisation");
  });

  it("sends completed personal profiles to the personal app", () => {
    expect(
      getRedirectForProfile({
        f_name: "Jane",
        l_initial: "S",
        account_type: "personal",
      }),
    ).toBe("/app/personal");
  });
});

describe("isAccountTypeProtectedRoute", () => {
  it("includes organisation app and portal routes", () => {
    expect(isAccountTypeProtectedRoute("/portal/organisation")).toBe(true);
    expect(isAccountTypeProtectedRoute("/app/organisation")).toBe(true);
  });

  it("includes the personal app route", () => {
    expect(isAccountTypeProtectedRoute("/app/personal")).toBe(true);
  });

  it("matches nested paths under protected routes", () => {
    expect(isAccountTypeProtectedRoute("/app/personal/settings")).toBe(true);
  });

  it("excludes public routes", () => {
    expect(isAccountTypeProtectedRoute("/")).toBe(false);
    expect(isAccountTypeProtectedRoute("/auth")).toBe(false);
    expect(isAccountTypeProtectedRoute("/onboarding")).toBe(false);
  });
});

describe("canAccessRoute", () => {
  it("allows organisation users on organisation routes", () => {
    expect(canAccessRoute("organisation", "/portal/organisation")).toBe(true);
    expect(canAccessRoute("organisation", "/app/organisation")).toBe(true);
  });

  it("denies organisation users on personal routes", () => {
    expect(canAccessRoute("organisation", "/app/personal")).toBe(false);
  });

  it("allows personal users on personal routes", () => {
    expect(canAccessRoute("personal", "/app/personal")).toBe(true);
  });

  it("denies personal users on organisation routes", () => {
    expect(canAccessRoute("personal", "/portal/organisation")).toBe(false);
    expect(canAccessRoute("personal", "/app/organisation")).toBe(false);
  });
});

describe("getRouteGuardRedirect", () => {
  it("sends incomplete profiles to onboarding from account routes", () => {
    expect(
      getRouteGuardRedirect(
        { f_name: "", l_initial: "", account_type: "personal" },
        "/app/personal",
      ),
    ).toBe("/onboarding");
  });

  it("allows incomplete profiles to stay on onboarding", () => {
    expect(
      getRouteGuardRedirect(
        { f_name: "", l_initial: "", account_type: "personal" },
        "/onboarding",
      ),
    ).toBeNull();
  });

  it("redirects organisation users away from personal routes", () => {
    expect(
      getRouteGuardRedirect(
        { f_name: "Jane", l_initial: "S", account_type: "organisation" },
        "/app/personal",
      ),
    ).toBe("/portal/organisation");
  });

  it("redirects personal users away from organisation routes", () => {
    expect(
      getRouteGuardRedirect(
        { f_name: "Jane", l_initial: "S", account_type: "personal" },
        "/portal/organisation",
      ),
    ).toBe("/app/personal");
  });

  it("allows access when profile and route match", () => {
    expect(
      getRouteGuardRedirect(
        { f_name: "Jane", l_initial: "S", account_type: "personal" },
        "/app/personal",
      ),
    ).toBeNull();
  });
});

describe("parseInviteUrl", () => {
  it("reads token_hash and type from query string", () => {
    const params = parseInviteUrl("?token_hash=abc123&type=invite", "");

    expect(params).toEqual({
      tokenHash: "abc123",
      type: "invite",
      code: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  it("reads access and refresh tokens from the URL hash", () => {
    const params = parseInviteUrl(
      "",
      "#access_token=jwt.access&refresh_token=jwt.refresh&type=invite",
    );

    expect(params).toEqual({
      tokenHash: null,
      type: "invite",
      code: null,
      accessToken: "jwt.access",
      refreshToken: "jwt.refresh",
    });
  });

  it("reads auth code from query string", () => {
    const params = parseInviteUrl("?code=pkce-code", "");

    expect(params.code).toBe("pkce-code");
  });
});

describe("hasInviteAuthParams", () => {
  it("returns true when invite token_hash is present", () => {
    expect(
      hasInviteAuthParams({
        tokenHash: "abc",
        type: "invite",
        code: null,
        accessToken: null,
        refreshToken: null,
      }),
    ).toBe(true);
  });

  it("returns true when hash session tokens are present", () => {
    expect(
      hasInviteAuthParams({
        tokenHash: null,
        type: "invite",
        code: null,
        accessToken: "access",
        refreshToken: "refresh",
      }),
    ).toBe(true);
  });

  it("returns false when no invite auth params are present", () => {
    expect(
      hasInviteAuthParams({
        tokenHash: null,
        type: null,
        code: null,
        accessToken: null,
        refreshToken: null,
      }),
    ).toBe(false);
  });
});
