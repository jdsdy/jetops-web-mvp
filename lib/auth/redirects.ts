import { isOnboardingComplete, type ProfileNameFields } from "./onboarding";
import { getPostOnboardingPath } from "./paths";

/**
 * Returns the route a user should be sent to based on profile completion.
 */
export function getRedirectForProfile(profile: ProfileNameFields): string {
  if (!isOnboardingComplete(profile)) {
    return "/onboarding";
  }

  return getPostOnboardingPath(profile.account_type);
}
