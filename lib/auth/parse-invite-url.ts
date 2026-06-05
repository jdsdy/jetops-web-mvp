export type InviteUrlParams = {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

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
