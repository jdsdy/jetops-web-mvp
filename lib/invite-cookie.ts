export const INVITE_COOKIE_NAME = "invite_id";

/** Invite cookie lifetime while the user completes sign-in (1 hour). */
export const INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export const inviteCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Stores the pending invitation id in an HttpOnly cookie.
 */
export async function setInviteIdCookie(invitationId: string): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  cookieStore.set(INVITE_COOKIE_NAME, invitationId, {
    ...inviteCookieOptions,
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the pending invitation cookie.
 */
export async function clearInviteIdCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  cookieStore.set(INVITE_COOKIE_NAME, "", {
    ...inviteCookieOptions,
    maxAge: 0,
  });
}

/**
 * Returns the pending invitation id from the HttpOnly cookie, if set.
 */
export async function getInviteIdCookie(): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return cookieStore.get(INVITE_COOKIE_NAME)?.value || undefined;
}
