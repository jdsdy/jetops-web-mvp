import { describe, expect, it } from "vitest";

import {
  hasInviteAuthParams,
  parseInviteUrl,
} from "@/lib/auth/parse-invite-url";

describe("parseInviteUrl", () => {
  it("reads token_hash and type from query string", () => {
    const params = parseInviteUrl(
      "?token_hash=abc123&type=invite",
      "",
    );

    expect(params).toEqual({
      tokenHash: "abc123",
      type: "invite",
      code: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  it("reads access and refresh tokens from the URL hash", () => {
    const params = parseInviteUrl(
      "",
      "#access_token=jwt.access&refresh_token=jwt.refresh&type=invite",
    );

    expect(params).toEqual({
      tokenHash: null,
      type: "invite",
      code: null,
      accessToken: "jwt.access",
      refreshToken: "jwt.refresh",
    });
  });

  it("reads auth code from query string", () => {
    const params = parseInviteUrl("?code=pkce-code", "");

    expect(params.code).toBe("pkce-code");
  });
});

describe("hasInviteAuthParams", () => {
  it("returns true when invite token_hash is present", () => {
    expect(
      hasInviteAuthParams({
        tokenHash: "abc",
        type: "invite",
        code: null,
        accessToken: null,
        refreshToken: null,
      }),
    ).toBe(true);
  });

  it("returns true when hash session tokens are present", () => {
    expect(
      hasInviteAuthParams({
        tokenHash: null,
        type: "invite",
        code: null,
        accessToken: "access",
        refreshToken: "refresh",
      }),
    ).toBe(true);
  });

  it("returns false when no invite auth params are present", () => {
    expect(
      hasInviteAuthParams({
        tokenHash: null,
        type: null,
        code: null,
        accessToken: null,
        refreshToken: null,
      }),
    ).toBe(false);
  });
});
