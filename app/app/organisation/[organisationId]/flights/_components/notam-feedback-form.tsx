"use client";

import { type FormEvent, useState } from "react";

import { PortalAlerts } from "@/components/portal-alerts";
import { PortalButton } from "@/components/portal-button";
import {
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
} from "@/components/portal-styles";
import {
  NOTAM_FEEDBACK_REASON_OPTIONS,
  type NotamFeedbackReason,
} from "@/lib/notam-feedback";

type NotamFeedbackFormProps = {
  organisationId: string;
  flightId: string;
  flightPlanId: string;
  analysedNotamId: number;
};

type ApiErrorResponse = {
  error?: string;
};

/**
 * Collects multiselect reasons and a required comment for an analysed NOTAM.
 */
export function NotamFeedbackForm({
  organisationId,
  flightId,
  flightPlanId,
  analysedNotamId,
}: NotamFeedbackFormProps) {
  const [selectedReasons, setSelectedReasons] = useState<NotamFeedbackReason[]>(
    [],
  );
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleReason(reason: NotamFeedbackReason) {
    setSelectedReasons((current) =>
      current.includes(reason)
        ? current.filter((value) => value !== reason)
        : [...current, reason],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const response = await fetch(
        `/api/organisations/${encodeURIComponent(organisationId)}/flights/${encodeURIComponent(flightId)}/notam-feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysed_notam_id: analysedNotamId,
            flight_plan_id: flightPlanId,
            reasons: selectedReasons,
            comment,
          }),
        },
      );

      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setError(data.error ?? "Failed to submit feedback");
        return;
      }

      setMessage("Feedback submitted. Thank you.");
      setSelectedReasons([]);
      setComment("");
    } catch {
      setError("Failed to submit feedback");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="border-t border-neutral-200 pt-4"
      onSubmit={handleSubmit}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">Feedback</p>
          <p className="mt-1 text-sm text-aviation-slate">
            Tell us what needs improvement for this NOTAM.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className={portalLabelClassName}>Reason</legend>
          <div className="mt-2 space-y-2">
            {NOTAM_FEEDBACK_REASON_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-2 text-sm text-neutral-900"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 rounded-sm border-neutral-300 text-aviation-navy focus:ring-aviation-blue"
                  checked={selectedReasons.includes(option.value)}
                  onChange={() => toggleReason(option.value)}
                  disabled={pending}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={portalFieldGroupClassName}>
          <label className={portalLabelClassName} htmlFor={`notam-feedback-${analysedNotamId}`}>
            Comment
          </label>
          <textarea
            id={`notam-feedback-${analysedNotamId}`}
            className={`${portalFieldClassName} min-h-24`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            required
            disabled={pending}
          />
        </div>

        <PortalAlerts error={error} message={message} />

        <PortalButton
          type="submit"
          disabled={pending || selectedReasons.length === 0 || !comment.trim()}
        >
          {pending ? "Submitting..." : "Submit feedback"}
        </PortalButton>
      </div>
    </form>
  );
}
