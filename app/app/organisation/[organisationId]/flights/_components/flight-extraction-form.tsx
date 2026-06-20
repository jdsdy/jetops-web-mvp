"use client";

import { useEffect, useState } from "react";

import { PortalAlerts } from "@/components/portal-alerts";
import { PortalButton } from "@/components/portal-button";
import {
  portalCardClassName,
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
} from "@/components/portal-styles";
import { SectionHeader } from "@/components/section-header";
import {
  formatFlightExtractionDateTimeForDisplay,
  formatFlightExtractionDateTimeForInput,
  hasFlightExtractionChanges,
  isFlightAnalysisBegunResponse,
  parseFlightExtractionDateTimeInput,
  type FlightExtractionDetails,
} from "@/lib/flights";

type FlightExtractionFormProps = {
  flightsApiBasePath: string;
  flightId: string;
  flightPlanId: string;
  jobId: string;
  savedDetails: FlightExtractionDetails;
  editable: boolean;
  onSaved: (details: FlightExtractionDetails) => void;
  onAnalysisBegun: () => void;
};

type ApiErrorResponse = {
  error?: string;
};

const EXTRACTION_FIELDS: {
  key: keyof FlightExtractionDetails;
  label: string;
  inputType: "text" | "datetime-local";
}[] = [
  { key: "departure_icao", label: "Departure ICAO", inputType: "text" },
  { key: "arrival_icao", label: "Arrival ICAO", inputType: "text" },
  { key: "source_app", label: "Source app", inputType: "text" },
  { key: "route", label: "Route", inputType: "text" },
  { key: "cruise_level", label: "Cruise level", inputType: "text" },
  { key: "dept_rwy", label: "Departure runway", inputType: "text" },
  { key: "arr_rwy", label: "Arrival runway", inputType: "text" },
  {
    key: "planned_dept_time",
    label: "Planned departure (UTC)",
    inputType: "datetime-local",
  },
  {
    key: "planned_arr_time",
    label: "Planned arrival (UTC)",
    inputType: "datetime-local",
  },
  { key: "alt_icao", label: "Alternate ICAO", inputType: "text" },
];

/**
 * Formats an extracted value for read-only display.
 */
function formatExtractedValue(
  value: string | null,
  inputType: "text" | "datetime-local",
): string {
  if (inputType === "datetime-local") {
    return formatFlightExtractionDateTimeForDisplay(value);
  }

  return value?.trim() ? value : "—";
}

/**
 * Returns the input value for a draft extraction field.
 */
function getDraftFieldValue(
  details: FlightExtractionDetails,
  key: keyof FlightExtractionDetails,
  inputType: "text" | "datetime-local",
): string {
  const value = details[key];

  if (inputType === "datetime-local") {
    return formatFlightExtractionDateTimeForInput(value);
  }

  return value ?? "";
}

/**
 * Displays extracted flight plan fields with optional editing and save actions.
 */
export function FlightExtractionForm({
  flightsApiBasePath,
  flightId,
  flightPlanId,
  jobId,
  savedDetails,
  editable,
  onSaved,
  onAnalysisBegun,
}: FlightExtractionFormProps) {
  const [draftDetails, setDraftDetails] = useState(savedDetails);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [analysePending, setAnalysePending] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);

  useEffect(() => {
    setDraftDetails(savedDetails);
  }, [savedDetails]);

  const hasUnsavedChanges = hasFlightExtractionChanges(savedDetails, draftDetails);
  const routeLabel =
    savedDetails.departure_icao && savedDetails.arrival_icao
      ? `${savedDetails.departure_icao} → ${savedDetails.arrival_icao}`
      : null;

  /**
   * Updates a single draft extraction field.
   */
  function handleFieldChange(
    key: keyof FlightExtractionDetails,
    inputType: "text" | "datetime-local",
    value: string,
  ) {
    setSaveError(null);

    setDraftDetails((current) => ({
      ...current,
      [key]:
        inputType === "datetime-local"
          ? parseFlightExtractionDateTimeInput(value)
          : value.trim()
            ? value
            : null,
    }));
  }

  /**
   * Persists draft extraction details to the API.
   */
  async function handleSave() {
    setSavePending(true);
    setSaveError(null);

    const response = await fetch(`${flightsApiBasePath}/${flightId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: jobId,
          ...draftDetails,
        }),
      });
    const result: unknown = await response.json();

    if (!response.ok) {
      const errorResult = result as ApiErrorResponse;
      setSaveError(errorResult.error ?? "Failed to save flight details");
      setSavePending(false);
      return;
    }

    const nextDetails = result as FlightExtractionDetails;
    onSaved(nextDetails);
    setDraftDetails(nextDetails);
    setSavePending(false);
  }

  /**
   * Triggers downstream analysis for the confirmed flight plan extraction.
   */
  async function handleAnalyse() {
    setAnalysePending(true);
    setAnalyseError(null);

    const response = await fetch(`${flightsApiBasePath}/${flightId}/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: jobId,
        }),
      });
    const result: unknown = await response.json();

    if (!response.ok) {
      const errorResult = result as ApiErrorResponse;
      setAnalyseError(errorResult.error ?? "Failed to start analysis");
      setAnalysePending(false);
      return;
    }

    if (!isFlightAnalysisBegunResponse(result)) {
      setAnalyseError("Analysis service did not begin processing");
      setAnalysePending(false);
      return;
    }

    onAnalysisBegun();
    setAnalysePending(false);
  }

  return (
    <div className={portalCardClassName}>
      <SectionHeader
        title="Flight details"
        description={
          editable
            ? "Review extracted values and confirm before starting NOTAM analysis."
            : routeLabel
              ? `${routeLabel} — extracted flight plan details.`
              : "Extracted flight plan details."
        }
        action={
          editable ? (
            <div className="flex flex-wrap gap-2">
              <PortalButton
                variant="secondary"
                disabled={savePending || !hasUnsavedChanges}
                onClick={() => {
                  void handleSave();
                }}
              >
                {savePending ? "Saving..." : "Save changes"}
              </PortalButton>
              <PortalButton
                disabled={hasUnsavedChanges || analysePending || !flightPlanId}
                onClick={() => {
                  void handleAnalyse();
                }}
              >
                {analysePending ? "Starting..." : "Confirm & analyse"}
              </PortalButton>
            </div>
          ) : null
        }
      />

      <PortalAlerts error={saveError ?? analyseError} />

      {editable ? (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          {EXTRACTION_FIELDS.map(({ key, label, inputType }) => (
            <div
              key={key}
              className={`${portalFieldGroupClassName} ${
                key === "route" ? "sm:col-span-2" : ""
              }`}
            >
              <label htmlFor={key} className={portalLabelClassName}>
                {label}
              </label>
              <input
                id={key}
                name={key}
                type={inputType}
                value={getDraftFieldValue(draftDetails, key, inputType)}
                onChange={(event) =>
                  handleFieldChange(key, inputType, event.target.value)
                }
                className={portalFieldClassName}
              />
            </div>
          ))}
        </form>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          {EXTRACTION_FIELDS.map(({ key, label, inputType }) => (
            <div
              key={key}
              className={key === "route" ? "sm:col-span-2" : undefined}
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-aviation-slate">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">
                {formatExtractedValue(savedDetails[key], inputType)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
