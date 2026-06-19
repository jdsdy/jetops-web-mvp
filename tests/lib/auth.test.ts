import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  validatePasswordFields,
  hasAuthLinkError,
  parseAuthLinkErrorFromHash,
  resolvePasswordResetNextPath,
  validateSignupCode,
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

describe("hasAuthLinkError", () => {
  it("detects access denied errors from query params", () => {
    expect(
      hasAuthLinkError({
        error: "access_denied",
        error_code: "otp_expired",
      }),
    ).toBe(true);
  });

  it("returns false when no auth link error is present", () => {
    expect(hasAuthLinkError({ error: null, error_code: null })).toBe(false);
  });
});

describe("parseAuthLinkErrorFromHash", () => {
  it("detects auth link errors in URL hash fragments", () => {
    expect(
      parseAuthLinkErrorFromHash(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toBe(true);
  });
});

describe("resolvePasswordResetNextPath", () => {
  it("returns the default update-password path", () => {
    expect(resolvePasswordResetNextPath(null)).toBe("/auth/update-password");
  });

  it("accepts an app-relative next path", () => {
    expect(resolvePasswordResetNextPath("/auth/update-password")).toBe(
      "/auth/update-password",
    );
  });

  it("extracts the path from a full redirect URL", () => {
    expect(
      resolvePasswordResetNextPath(
        "https://app.jetops.test/auth/update-password",
      ),
    ).toBe("/auth/update-password");
  });
});

describe("validatePasswordFields", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePasswordFields("short", "short")).toEqual({
      valid: false,
      error: "Password must be at least 8 characters",
    });
  });

  it("rejects mismatched passwords", () => {
    expect(validatePasswordFields("password-one", "password-two")).toEqual({
      valid: false,
      error: "Passwords do not match",
    });
  });

  it("accepts matching passwords of at least 8 characters", () => {
    expect(validatePasswordFields("password-one", "password-one")).toEqual({
      valid: true,
      password: "password-one",
    });
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
  it("redirects organisation accounts to the organisation callback", () => {
    expect(getPostOnboardingPath("organisation")).toBe("/app/callback");
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

  it("sends completed organisation profiles to the organisation callback", () => {
    expect(
      getRedirectForProfile({
        f_name: "Jane",
        l_initial: "S",
        account_type: "organisation",
      }),
    ).toBe("/app/callback");
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
  it("includes organisation app routes", () => {
    expect(isAccountTypeProtectedRoute("/app/callback")).toBe(true);
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
    expect(canAccessRoute("organisation", "/app/callback")).toBe(true);
    expect(canAccessRoute("organisation", "/app/organisation")).toBe(true);
  });

  it("denies organisation users on personal routes", () => {
    expect(canAccessRoute("organisation", "/app/personal")).toBe(false);
  });

  it("allows personal users on personal routes", () => {
    expect(canAccessRoute("personal", "/app/personal")).toBe(true);
  });

  it("denies personal users on organisation routes", () => {
    expect(canAccessRoute("personal", "/app/callback")).toBe(false);
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
    ).toBe("/app/callback");
  });

  it("redirects personal users away from organisation routes", () => {
    expect(
      getRouteGuardRedirect(
        { f_name: "Jane", l_initial: "S", account_type: "personal" },
        "/app/organisation",
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

describe("validateSignupCode", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("JETOPS_API_KEY", "test-api-key");
    vi.stubEnv("JETOPS_API_URL", "http://api.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("rejects an empty signup code", async () => {
    await expect(validateSignupCode("   ")).resolves.toEqual({
      valid: false,
      error: "Signup code is required",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a valid signup code", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(validateSignupCode("beta-access")).resolves.toEqual({
      valid: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/v1/signup", {
      method: "POST",
      headers: {
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "beta-access" }),
    });
  });

  it("rejects an invalid signup code with the API error message", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Signup code is not valid" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(validateSignupCode("bad-code")).resolves.toEqual({
      valid: false,
      error: "Signup code is not valid",
    });
  });

  it("rejects when the API is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    await expect(validateSignupCode("beta-access")).resolves.toEqual({
      valid: false,
      error: "Unable to verify signup code",
    });
  });
});
