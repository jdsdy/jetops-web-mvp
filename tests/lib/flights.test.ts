import { describe, expect, it } from "vitest";

import {
  buildFlightPlanStoragePath,
  sanitizeFlightPlanFilename,
  validateCreateFlightFormData,
} from "@/lib/flights";

describe("buildFlightPlanStoragePath", () => {
  it("builds a storage path from org, flight, plan, and filename", () => {
    expect(
      buildFlightPlanStoragePath(
        "org-1",
        "flight-2",
        "plan-3",
        "briefing.pdf",
      ),
    ).toBe("org-1/flight-2/plan-3/briefing.pdf");
  });
});

describe("sanitizeFlightPlanFilename", () => {
  it("returns briefing.pdf for empty input", () => {
    expect(sanitizeFlightPlanFilename("")).toBe("briefing.pdf");
  });

  it("strips path segments and enforces pdf extension", () => {
    expect(sanitizeFlightPlanFilename("../../evil/plan.PDF")).toBe("plan.pdf");
  });

  it("preserves a safe filename", () => {
    expect(sanitizeFlightPlanFilename("my-briefing.pdf")).toBe("my-briefing.pdf");
  });
});

describe("validateCreateFlightFormData", () => {
  const validPayload = {
    aircraft_id: "11111111-1111-4111-8111-111111111111",
    pic_user_id: "22222222-2222-4222-8222-222222222222",
    flight_plan: new File(["pdf"], "plan.pdf", { type: "application/pdf" }),
  };

  it("accepts valid form data", () => {
    const formData = new FormData();
    formData.set("aircraft_id", validPayload.aircraft_id);
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set("flight_plan", validPayload.flight_plan);

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: true,
      payload: {
        aircraft_id: validPayload.aircraft_id,
        pic_user_id: validPayload.pic_user_id,
        flight_plan: validPayload.flight_plan,
      },
    });
  });

  it("rejects a missing aircraft id", () => {
    const formData = new FormData();
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set("flight_plan", validPayload.flight_plan);

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: false,
      error: "Aircraft is required",
    });
  });

  it("rejects a non-pdf file", () => {
    const formData = new FormData();
    formData.set("aircraft_id", validPayload.aircraft_id);
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set(
      "flight_plan",
      new File(["txt"], "notes.txt", { type: "text/plain" }),
    );

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: false,
      error: "Flight plan must be a PDF file",
    });
  });

  it("rejects an oversized pdf", () => {
    const formData = new FormData();
    formData.set("aircraft_id", validPayload.aircraft_id);
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set(
      "flight_plan",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "plan.pdf", {
        type: "application/pdf",
      }),
    );

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: false,
      error: "Flight plan must be 10MB or smaller",
    });
  });
});
