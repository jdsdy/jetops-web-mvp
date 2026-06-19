import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import {
  hasAuthLinkError,
  INVALID_RESET_LINK_AUTH_ERROR,
  resolvePasswordResetNextPath,
} from "@/lib/auth";
import { createRouteHandlerClient } from "@/lib/supabase/server";

function redirectToAuthError(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/auth";
  redirectTo.search = "";
  redirectTo.searchParams.set("error", INVALID_RESET_LINK_AUTH_ERROR);
  return NextResponse.redirect(redirectTo);
}

/**
 * Exchanges Supabase email OTP and PKCE links for a session before redirecting onward.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (
    hasAuthLinkError({
      error: searchParams.get("error"),
      error_code: searchParams.get("error_code"),
    })
  ) {
    return redirectToAuthError(request);
  }

  const nextPath = resolvePasswordResetNextPath(searchParams.get("next"));
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  redirectTo.search = "";

  let response = NextResponse.redirect(redirectTo);
  const supabase = createRouteHandlerClient(request, response);

  const code = searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    return redirectToAuthError(request);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
    }
  }

  return redirectToAuthError(request);
}
