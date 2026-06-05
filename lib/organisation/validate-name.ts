import { organisationNameToSlug } from "./slug";

type ValidationSuccess = {
  valid: true;
  name: string;
  slug: string;
};

type ValidationFailure = {
  valid: false;
  error: string;
};

export type OrganisationNameValidation = ValidationSuccess | ValidationFailure;

/**
 * Validates an organisation name and derives its slug.
 */
export function validateOrganisationName(name: string): OrganisationNameValidation {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Organisation name is required" };
  }

  const slug = organisationNameToSlug(trimmed);

  if (!slug) {
    return { valid: false, error: "Organisation name must contain letters or numbers" };
  }

  return { valid: true, name: trimmed, slug };
}
