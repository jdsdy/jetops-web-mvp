import { describe, expect, it } from "vitest";

import { validateInvitePayload } from "@/lib/organisation/validate-invite";

describe("validateInvitePayload", () => {
  it("requires an email", () => {
    expect(
      validateInvitePayload({
        email: "",
        fName: "Jane",
        lInitial: "S",
        role: "member",
      }),
    ).toEqual({ valid: false, error: "Email is required" });
  });

  it("requires a first name", () => {
    expect(
      validateInvitePayload({
        email: "jane@example.com",
        fName: "",
        lInitial: "S",
        role: "member",
      }),
    ).toEqual({ valid: false, error: "First name is required" });
  });

  it("requires a role", () => {
    expect(
      validateInvitePayload({
        email: "jane@example.com",
        fName: "Jane",
        lInitial: "S",
        role: "",
      }),
    ).toEqual({ valid: false, error: "Role is required" });
  });

  it("accepts a valid payload", () => {
    expect(
      validateInvitePayload({
        email: "jane@example.com",
        fName: "  Jane  ",
        lInitial: " S ",
        role: "member",
      }),
    ).toEqual({
      valid: true,
      email: "jane@example.com",
      fName: "Jane",
      lInitial: "S",
      role: "member",
    });
  });
});
