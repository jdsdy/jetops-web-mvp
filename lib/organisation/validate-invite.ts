type InviteInput = {
  email: string;
  fName: string;
  lInitial: string;
  role: string;
};

type ValidationSuccess = {
  valid: true;
  email: string;
  fName: string;
  lInitial: string;
  role: string;
};

type ValidationFailure = {
  valid: false;
  error: string;
};

export type InviteValidationResult = ValidationSuccess | ValidationFailure;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates organisation invite payload fields.
 */
export function validateInvitePayload(input: InviteInput): InviteValidationResult {
  const email = input.email.trim();
  const fName = input.fName.trim();
  const lInitial = input.lInitial.trim();
  const role = input.role.trim();

  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { valid: false, error: "Email is invalid" };
  }

  if (!fName) {
    return { valid: false, error: "First name is required" };
  }

  if (!lInitial) {
    return { valid: false, error: "Last name initial is required" };
  }

  if (!role) {
    return { valid: false, error: "Role is required" };
  }

  return { valid: true, email, fName, lInitial, role };
}
