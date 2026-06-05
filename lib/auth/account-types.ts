export const ACCOUNT_TYPES = ["organisation", "personal"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Returns whether the provided value is a supported account type.
 */
export function isValidAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}
