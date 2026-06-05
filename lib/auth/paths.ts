import type { AccountType } from "./account-types";
import { isValidAccountType } from "./account-types";

/**
 * Returns the post-onboarding destination for a given account type.
 */
export function getPostOnboardingPath(accountType: string): string {
  if (!isValidAccountType(accountType)) {
    return "/onboarding";
  }

  const paths: Record<AccountType, string> = {
    organisation: "/portal/organisation",
    personal: "/app/personal",
  };

  return paths[accountType];
}
