import { getJetOpsApiKey, getJetOpsApiUrl } from "@/lib/env";

export const ACCOUNT_TYPES = ["organisation", "personal"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type ProfileNameFields = {
  f_name: string;
  l_initial: string;
  account_type: string;
};

type OnboardingInput = {
  fName: string;
  lInitial: string;
};

type OnboardingValidationSuccess = {
  valid: true;
  fName: string;
  lInitial: string;
};

type OnboardingValidationFailure = {
  valid: false;
  error: string;
};

export type OnboardingValidationResult =
  | OnboardingValidationSuccess
  | OnboardingValidationFailure;

export type InviteUrlParams = {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export const DISABLED_MEMBER_AUTH_ERROR = "disabled_access";

export const DISABLED_MEMBER_MESSAGE =
  "Your account access has been disabled, please contact your system administrator";

const ORGANISATION_ROUTE_PREFIXES = ["/app/callback", "/app/organisation"];
const PERSONAL_ROUTE_PREFIXES = ["/app/personal"];

/**
 * Returns whether the provided value is a supported account type.
 */
export function isValidAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * Validates and normalises onboarding name fields.
 */
export function validateOnboardingFields(
  input: OnboardingInput,
): OnboardingValidationResult {
  const fName = input.fName.trim();
  const lInitial = input.lInitial.trim();

  if (!fName) {
    return { valid: false, error: "First name is required" };
  }

  if (!lInitial) {
    return { valid: false, error: "Last name initial is required" };
  }

  return { valid: true, fName, lInitial };
}

/**
 * Returns whether a profile has completed the onboarding name step.
 */
export function isOnboardingComplete(profile: ProfileNameFields): boolean {
  return profile.f_name.trim().length > 0 && profile.l_initial.trim().length > 0;
}

/**
 * Returns the post-onboarding destination for a given account type.
 */
export function getPostOnboardingPath(accountType: string): string {
  if (!isValidAccountType(accountType)) {
    return "/onboarding";
  }

  const paths: Record<AccountType, string> = {
    organisation: "/app/callback",
    personal: "/app/personal",
  };

  return paths[accountType];
}

/**
 * Returns the route a user should be sent to based on profile completion.
 */
export function getRedirectForProfile(profile: ProfileNameFields): string {
  if (!isOnboardingComplete(profile)) {
    return "/onboarding";
  }

  return getPostOnboardingPath(profile.account_type);
}

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

/**
 * Parses invite auth parameters from query string and URL hash fragments.
 */
export function parseInviteUrl(search: string, hash: string): InviteUrlParams {
  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const hashParams = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );

  return {
    tokenHash: searchParams.get("token_hash"),
    type: searchParams.get("type") ?? hashParams.get("type"),
    code: searchParams.get("code"),
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
  };
}

/**
 * Returns whether the URL contains parameters used to establish an invite session.
 */
export function hasInviteAuthParams(params: InviteUrlParams): boolean {
  if (params.code) {
    return true;
  }

  if (params.accessToken && params.refreshToken) {
    return true;
  }

  return params.tokenHash !== null && params.type === "invite";
}

export type SignupCodeValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Verifies a closed-beta signup code with the JetOps API before registration.
 */
export async function validateSignupCode(
  code: string,
): Promise<SignupCodeValidationResult> {
  const trimmedCode = code.trim();

  if (!trimmedCode) {
    return { valid: false, error: "Signup code is required" };
  }

  const apiKey = getJetOpsApiKey();

  if (!apiKey) {
    return { valid: false, error: "Signup is temporarily unavailable" };
  }

  let response: Response;

  try {
    response = await fetch(`${getJetOpsApiUrl()}/v1/signup`, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: trimmedCode }),
    });
  } catch {
    return { valid: false, error: "Unable to verify signup code" };
  }

  if (response.ok) {
    return { valid: true };
  }

  if (response.status === 400) {
    try {
      const data = (await response.json()) as {
        detail?: string;
        message?: string;
      };
      const message = data.detail ?? data.message;

      if (message) {
        return { valid: false, error: message };
      }
    } catch {
      // Fall through to the default invalid-code message.
    }

    return { valid: false, error: "Invalid signup code" };
  }

  return { valid: false, error: "Unable to verify signup code" };
}
