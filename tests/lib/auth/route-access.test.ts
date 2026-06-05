import { describe, expect, it } from "vitest";

import {
  canAccessRoute,
  getRouteGuardRedirect,
  isAccountTypeProtectedRoute,
} from "@/lib/auth/route-access";

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
