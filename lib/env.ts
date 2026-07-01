/**
 * Returns the public site URL used for auth redirects.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Returns the redirect URL used after a password reset email link is opened.
 */
export function getPasswordResetRedirectUrl(): string {
  return `${getSiteUrl()}/auth/confirm?next=/auth/update-password`;
}

/**
 * Returns the JetOps jobs API base URL.
 */
export function getJetOpsApiUrl(): string {
  return process.env.JETOPS_API_URL ?? "http://127.0.0.1:8000/v1/app";
}

/**
 * Returns the JetOps API key used for server-side job requests.
 */
export function getJetOpsApiKey(): string | undefined {
  return process.env.JETOPS_API_KEY;
}
