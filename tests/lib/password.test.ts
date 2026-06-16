import { describe, expect, it } from "vitest";

import {
  generateTemporaryPassword,
  TEMPORARY_PASSWORD_CHARSET,
} from "@/lib/password";

describe("generateTemporaryPassword", () => {
  it("generates a 10 character password by default", () => {
    expect(generateTemporaryPassword()).toHaveLength(10);
  });

  it("generates a password using only the allowed charset", () => {
    const password = generateTemporaryPassword();

    for (const char of password) {
      expect(TEMPORARY_PASSWORD_CHARSET.includes(char)).toBe(true);
    }
  });

  it("generates different values across calls", () => {
    const values = new Set<string>();

    for (let i = 0; i < 25; i += 1) {
      values.add(generateTemporaryPassword());
    }

    expect(values.size).toBeGreaterThan(10);
  });
});

