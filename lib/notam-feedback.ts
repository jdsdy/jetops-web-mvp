const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const NOTAM_FEEDBACK_REASON_OPTIONS = [
  { label: "Poor extraction", value: "extraction" },
  { label: "Incorrect classification", value: "classification" },
  { label: "Poor notam summary", value: "summary" },
] as const;

export type NotamFeedbackReason =
  (typeof NOTAM_FEEDBACK_REASON_OPTIONS)[number]["value"];

const NOTAM_FEEDBACK_REASON_VALUES = NOTAM_FEEDBACK_REASON_OPTIONS.map(
  (option) => option.value,
);

type NotamFeedbackValidationSuccess = {
  valid: true;
  analysedNotamId: number;
  flightPlanId: string;
  reasons: NotamFeedbackReason[];
  reasonCsv: string;
  comment: string;
};

type NotamFeedbackValidationFailure = {
  valid: false;
  error: string;
};

export type NotamFeedbackValidationResult =
  | NotamFeedbackValidationSuccess
  | NotamFeedbackValidationFailure;

/**
 * Serialises selected feedback reasons to the CSV format stored in the database.
 */
export function formatNotamFeedbackReasonsCsv(
  reasons: readonly NotamFeedbackReason[],
): string {
  return [...reasons].sort().join(",");
}

/**
 * Validates feedback payload for an analysed NOTAM.
 */
export function validateNotamFeedbackPayload(body: unknown): NotamFeedbackValidationResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Invalid request body" };
  }

  const payload = body as Record<string, unknown>;
  const analysedNotamIdRaw = String(payload.analysed_notam_id ?? "").trim();
  const flightPlanId = String(payload.flight_plan_id ?? "").trim();
  const commentRaw = payload.comment;
  const reasonsRaw = payload.reasons;

  if (!analysedNotamIdRaw) {
    return { valid: false, error: "Analysed NOTAM id is required" };
  }

  const analysedNotamId = Number(analysedNotamIdRaw);

  if (!Number.isInteger(analysedNotamId) || analysedNotamId <= 0) {
    return { valid: false, error: "Analysed NOTAM id is invalid" };
  }

  if (!flightPlanId) {
    return { valid: false, error: "Flight plan id is required" };
  }

  if (!UUID_PATTERN.test(flightPlanId)) {
    return { valid: false, error: "Flight plan id is invalid" };
  }

  if (!Array.isArray(reasonsRaw) || reasonsRaw.length === 0) {
    return { valid: false, error: "Select at least one reason" };
  }

  const uniqueReasons = [...new Set(reasonsRaw.map((reason) => String(reason).trim()))].filter(
    Boolean,
  ) as NotamFeedbackReason[];

  if (uniqueReasons.length === 0) {
    return { valid: false, error: "Select at least one reason" };
  }

  for (const reason of uniqueReasons) {
    if (!NOTAM_FEEDBACK_REASON_VALUES.includes(reason)) {
      return { valid: false, error: "One or more reasons are invalid" };
    }
  }

  const reasons = [...uniqueReasons].sort();

  if (typeof commentRaw !== "string") {
    return { valid: false, error: "Comment is required" };
  }

  const comment = commentRaw.trim();

  if (!comment) {
    return { valid: false, error: "Comment is required" };
  }

  return {
    valid: true,
    analysedNotamId,
    flightPlanId,
    reasons,
    reasonCsv: formatNotamFeedbackReasonsCsv(reasons),
    comment,
  };
}
