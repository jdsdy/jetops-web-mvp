import { describe, expect, it } from "vitest";

import { formatPortalDate, formatPortalDateTime } from "@/lib/format";

describe("formatPortalDate", () => {
  it("formats an ISO timestamp in en-AU", () => {
    expect(formatPortalDate("2026-06-12T00:00:00.000Z")).toBe("12/06/2026");
  });
});

describe("formatPortalDateTime", () => {
  it("formats an ISO timestamp with time in en-AU", () => {
    const formatted = formatPortalDateTime("2026-06-12T02:30:00.000Z");

    expect(formatted).toContain("12/06/2026");
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});
