import { describe, expect, it } from "vitest";

import { formatMemberDisplayName } from "@/lib/organisation/display-name";

describe("formatMemberDisplayName", () => {
  it("joins first name and last initial with a space", () => {
    expect(formatMemberDisplayName("Josh", "S")).toBe("Josh S");
  });

  it("trims whitespace from both parts", () => {
    expect(formatMemberDisplayName("  Josh  ", " S ")).toBe("Josh S");
  });
});
