export type ProfileNameFields = {
  f_name: string;
  l_initial: string;
  account_type: string;
};

type OnboardingInput = {
  fName: string;
  lInitial: string;
};

type ValidationSuccess = {
  valid: true;
  fName: string;
  lInitial: string;
};

type ValidationFailure = {
  valid: false;
  error: string;
};

export type OnboardingValidationResult = ValidationSuccess | ValidationFailure;

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
