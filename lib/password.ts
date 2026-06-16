import { randomInt } from "crypto";

const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*_-+=";

/**
 * Generates a temporary password for invited users.
 *
 * The password is intentionally short-lived (users must change it on first sign-in).
 */
export function generateTemporaryPassword(length = 10): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Temporary password length must be a positive integer");
  }

  let password = "";

  for (let i = 0; i < length; i += 1) {
    password += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)];
  }

  return password;
}

export const TEMPORARY_PASSWORD_CHARSET = PASSWORD_CHARSET;

