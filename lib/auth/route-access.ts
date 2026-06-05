import { isOnboardingComplete, type ProfileNameFields } from "./onboarding";
import { getPostOnboardingPath } from "./paths";
import { isValidAccountType } from "./account-types";

const ORGANISATION_ROUTE_PREFIXES = ["/portal/organisation", "/app/organisation"];
const PERSONAL_ROUTE_PREFIXES = ["/app/personal"];

/**
 * Returns whether the pathname is restricted by account type.
 */
export function isAccountTypeProtectedRoute(pathname: string): boolean {
  return [...ORGANISATION_ROUTE_PREFIXES, ...PERSONAL_ROUTE_PREFIXES].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Returns whether the pathname requires an authenticated user.
 */
export function isAuthProtectedRoute(pathname: string): boolean {
  return (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    isAccountTypeProtectedRoute(pathname)
  );
}

/**
 * Returns whether the pathname is publicly accessible before authentication.
 */
export function isPublicAuthRoute(pathname: string): boolean {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/" ||
    pathname.startsWith("/api/")
  );
}

/**
 * Returns whether the given account type may access the pathname.
 */
export function canAccessRoute(accountType: string, pathname: string): boolean {
  if (!isValidAccountType(accountType)) {
    return false;
  }

  const isPersonalRoute = PERSONAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isOrganisationRoute = ORGANISATION_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPersonalRoute) {
    return accountType === "personal";
  }

  if (isOrganisationRoute) {
    return accountType === "organisation";
  }

  return true;
}

/**
 * Returns a redirect path when access should be denied, otherwise null.
 */
export function getRouteGuardRedirect(
  profile: ProfileNameFields,
  pathname: string,
): string | null {
  if (!isAccountTypeProtectedRoute(pathname)) {
    return null;
  }

  if (!isOnboardingComplete(profile)) {
    return "/onboarding";
  }

  if (!canAccessRoute(profile.account_type, pathname)) {
    return getPostOnboardingPath(profile.account_type);
  }

  return null;
}
