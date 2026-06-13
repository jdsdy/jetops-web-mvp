import { describe, expect, it } from "vitest";

import {
  NOTAM_FEEDBACK_REASON_OPTIONS,
  formatNotamFeedbackReasonsCsv,
  validateNotamFeedbackPayload,
} from "@/lib/notam-feedback";

describe("NOTAM_FEEDBACK_REASON_OPTIONS", () => {
  it("maps display labels to database reason values", () => {
    expect(NOTAM_FEEDBACK_REASON_OPTIONS).toEqual([
      { label: "Poor extraction", value: "extraction" },
      { label: "Incorrect classification", value: "classification" },
      { label: "Poor notam summary", value: "summary" },
    ]);
  });
});

describe("formatNotamFeedbackReasonsCsv", () => {
  it("joins reasons in a stable order", () => {
    expect(formatNotamFeedbackReasonsCsv(["summary", "extraction"])).toBe(
      "extraction,summary",
    );
  });
});

describe("validateNotamFeedbackPayload", () => {
  it("requires an analysed notam id", () => {
    expect(
      validateNotamFeedbackPayload({
        analysed_notam_id: "",
        flight_plan_id: "11111111-1111-4111-8111-111111111111",
        reasons: ["extraction"],
        comment: "Needs review",
      }),
    ).toEqual({ valid: false, error: "Analysed NOTAM id is required" });
  });

  it("requires a flight plan id", () => {
    expect(
      validateNotamFeedbackPayload({
        analysed_notam_id: "42",
        flight_plan_id: "",
        reasons: ["extraction"],
        comment: "Needs review",
      }),
    ).toEqual({ valid: false, error: "Flight plan id is required" });
  });

  it("requires at least one reason", () => {
    expect(
      validateNotamFeedbackPayload({
        analysed_notam_id: "42",
        flight_plan_id: "11111111-1111-4111-8111-111111111111",
        reasons: [],
        comment: "Needs review",
      }),
    ).toEqual({ valid: false, error: "Select at least one reason" });
  });

  it("rejects unknown reasons", () => {
    expect(
      validateNotamFeedbackPayload({
        analysed_notam_id: "42",
        flight_plan_id: "11111111-1111-4111-8111-111111111111",
        reasons: ["extraction", "other"],
        comment: "Needs review",
      }),
    ).toEqual({ valid: false, error: "One or more reasons are invalid" });
  });

  it("requires a comment", () => {
    expect(
      validateNotamFeedbackPayload({
        analysed_notam_id: "42",
        flight_plan_id: "11111111-1111-4111-8111-111111111111",
        reasons: ["classification"],
        comment: "   ",
      }),
    ).toEqual({ valid: false, error: "Comment is required" });
  });

  it("accepts a valid payload", () => {
    expect(
      validateNotamFeedbackPayload({
        analysed_notam_id: "42",
        flight_plan_id: "11111111-1111-4111-8111-111111111111",
        reasons: ["summary", "extraction"],
        comment: "  The summary missed the runway closure.  ",
      }),
    ).toEqual({
      valid: true,
      analysedNotamId: 42,
      flightPlanId: "11111111-1111-4111-8111-111111111111",
      reasons: ["extraction", "summary"],
      reasonCsv: "extraction,summary",
      comment: "The summary missed the runway closure.",
    });
  });
});
