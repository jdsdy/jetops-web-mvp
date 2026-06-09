"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FlightExtractionForm } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-form";
import { RawNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import {
  getFlightExtractionResult,
  getRawNotamsForAnalysis,
  isExtractionReadyJobStatus,
  isFlightExtractionEditableJobStatus,
  type FlightExtractionDetails,
  type RawNotam,
} from "@/lib/flights";
import { createClient } from "@/lib/supabase/client";

const TERMINAL_JOB_STATUSES = ["complete", "failed"] as const;

type FlightExtractionDetailsProps = {
  organisationId: string;
  flightId: string;
  initialDetails: FlightExtractionDetails;
  jobId: string;
};

type AnalysisJob = {
  status: string;
};

/**
 * Returns whether an analysis job has reached a terminal status.
 */
function isTerminalJobStatus(status: string): boolean {
  return TERMINAL_JOB_STATUSES.includes(
    status as (typeof TERMINAL_JOB_STATUSES)[number],
  );
}

/**
 * Tracks analysis job status and loads extracted fields once extraction completes.
 */
export function FlightExtractionDetailsSection({
  organisationId,
  flightId,
  initialDetails,
  jobId,
}: FlightExtractionDetailsProps) {
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [savedDetails, setSavedDetails] = useState(initialDetails);
  const [notams, setNotams] = useState<RawNotam[]>([]);
  const [showExtraction, setShowExtraction] = useState(false);
  const extractionLoadedRef = useRef(false);

  const loadExtractionDetails = useCallback(async () => {
    const supabase = createClient();
    const result = await getFlightExtractionResult(supabase, flightId);

    if (!result) {
      return;
    }

    const nextNotams = await getRawNotamsForAnalysis(
      supabase,
      jobId,
      result.flightPlanId,
    );

    extractionLoadedRef.current = true;
    setSavedDetails(result.details);
    setNotams(nextNotams);
    setShowExtraction(true);
  }, [flightId, jobId]);

  const handleJobStatus = useCallback(
    (nextStatus: string, previousStatus: string | null) => {
      setJobStatus(nextStatus);

      if (!isExtractionReadyJobStatus(nextStatus) || extractionLoadedRef.current) {
        return isTerminalJobStatus(nextStatus);
      }

      const shouldLoad =
        previousStatus === null ||
        (previousStatus === "processing_extraction" &&
          nextStatus === "awaiting_confirmation");

      if (shouldLoad) {
        void loadExtractionDetails();
      }

      return isTerminalJobStatus(nextStatus);
    },
    [loadExtractionDetails],
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let previousStatus: string | null = null;

    function applyJobStatus(nextStatus: string) {
      if (cancelled) {
        return false;
      }

      const shouldStop = handleJobStatus(nextStatus, previousStatus);
      previousStatus = nextStatus;
      return shouldStop;
    }

    const channel = supabase
      .channel(`flight-analysis-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analysis_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updatedJob = payload.new as AnalysisJob;

          if (applyJobStatus(updatedJob.status)) {
            void supabase.removeChannel(channel);
          }
        },
      )
      .subscribe();

    void (async () => {
      const { data: job } = await supabase
        .from("analysis_jobs")
        .select("status")
        .eq("id", jobId)
        .single();

      if (cancelled || !job) {
        return;
      }

      if (applyJobStatus(job.status)) {
        void supabase.removeChannel(channel);
      }
    })();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [handleJobStatus, jobId]);

  const editable =
    jobStatus !== null && isFlightExtractionEditableJobStatus(jobStatus);

  return (
    <>
      <section>
        <h2>Flight analysis</h2>
        <p>Status: {jobStatus ?? "Loading..."}</p>
      </section>

      {showExtraction ? (
        <>
          <FlightExtractionForm
            organisationId={organisationId}
            flightId={flightId}
            jobId={jobId}
            savedDetails={savedDetails}
            editable={editable}
            onSaved={setSavedDetails}
          />
          <RawNotamsList notams={notams} />
        </>
      ) : null}
    </>
  );
}
