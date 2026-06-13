"use client";

import { useEffect, useState } from "react";

import { portalCardClassName } from "@/components/portal-styles";

type AnalysisProgressPhase = "extraction" | "analysis";

type AnalysisProgressPanelProps = {
  phase: AnalysisProgressPhase;
  totalNotams?: number;
  classifiedCount?: number;
  pendingCount?: number;
  startedAt?: number | null;
};

type ProgressStep = {
  label: string;
  state: "complete" | "active" | "pending";
};

const TYPICAL_ANALYSIS_DURATION_MS = 2 * 60 * 1000;

/**
 * Formats elapsed milliseconds as m:ss.
 */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Returns the ordered progress steps for the current phase.
 */
function buildProgressSteps(
  phase: AnalysisProgressPhase,
  classifiedCount: number,
  pendingCount: number,
): ProgressStep[] {
  if (phase === "extraction") {
    return [
      { label: "Reading flight plan document", state: "active" },
      { label: "Extracting route and timing", state: "pending" },
      { label: "Identifying applicable NOTAMs", state: "pending" },
    ];
  }

  const classifyingState =
    classifiedCount > 0 || pendingCount > 0 ? "active" : "active";

  return [
    { label: "Flight plan extracted", state: "complete" },
    { label: "Flight details confirmed", state: "complete" },
    { label: "Classifying NOTAMs", state: classifyingState },
  ];
}

/**
 * Professional progress display for extraction and NOTAM analysis.
 */
export function AnalysisProgressPanel({
  phase,
  totalNotams = 0,
  classifiedCount = 0,
  pendingCount = 0,
  startedAt = null,
}: AnalysisProgressPanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const steps = buildProgressSteps(phase, classifiedCount, pendingCount);
  const title =
    phase === "extraction" ? "Extracting flight plan" : "NOTAM analysis in progress";

  useEffect(() => {
    if (!startedAt) {
      setElapsedMs(0);
      return;
    }

    function updateElapsed() {
      setElapsedMs(Date.now() - startedAt!);
    }

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [startedAt]);

  const showNotamProgress =
    phase === "analysis" && totalNotams > 0 && (classifiedCount > 0 || pendingCount > 0);

  return (
    <div className={`${portalCardClassName} border-aviation-navy/15`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <p className="mt-1 text-sm text-aviation-slate">
            {phase === "extraction"
              ? "Your flight plan is being processed. Review fields when extraction completes."
              : "NOTAMs are being reviewed and classified. Results will appear below as they complete."}
          </p>
        </div>

        {startedAt ? (
          <div className="mt-2 text-right sm:mt-0">
            <p className="text-xs font-medium uppercase tracking-wide text-aviation-slate">
              Elapsed
            </p>
            <p className="font-mono text-lg font-semibold text-aviation-navy">
              {formatElapsed(elapsedMs)}
            </p>
          </div>
        ) : null}
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                step.state === "complete"
                  ? "bg-aviation-navy"
                  : step.state === "active"
                    ? "animate-pulse bg-aviation-blue"
                    : "bg-neutral-300"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${
                  step.state === "pending"
                    ? "text-aviation-slate"
                    : "font-medium text-neutral-900"
                }`}
              >
                {step.label}
              </p>
              {step.state === "active" && phase === "analysis" ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full w-1/3 animate-[analysis-indeterminate_1.8s_ease-in-out_infinite] rounded-full bg-aviation-navy" />
                </div>
              ) : null}
            </div>
            {step.state === "complete" ? (
              <span className="text-xs font-medium text-aviation-slate">Done</span>
            ) : null}
            {step.state === "active" ? (
              <span className="text-xs font-medium text-aviation-blue">In progress</span>
            ) : null}
          </li>
        ))}
      </ol>

      {showNotamProgress ? (
        <p className="mt-5 border-t border-neutral-200 pt-4 text-sm text-neutral-900">
          <span className="font-medium">{classifiedCount}</span> of{" "}
          <span className="font-medium">{totalNotams}</span> NOTAMs classified
          {pendingCount > 0 ? (
            <>
              {" "}
              · <span className="font-medium">{pendingCount}</span> remaining
            </>
          ) : null}
        </p>
      ) : null}

      {phase === "analysis" ? (
        <p className="mt-3 text-xs text-aviation-slate">
          Analysis typically completes within about 2 minutes. You may leave this page
          open; results update automatically.
        </p>
      ) : null}

      {phase === "analysis" && elapsedMs > TYPICAL_ANALYSIS_DURATION_MS ? (
        <p className="mt-2 text-xs text-aviation-slate">
          Analysis is taking longer than usual. Processing will continue until complete.
        </p>
      ) : null}
    </div>
  );
}
