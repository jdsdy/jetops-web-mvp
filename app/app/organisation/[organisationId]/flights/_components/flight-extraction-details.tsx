"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RawNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import {
  getFlightExtractionResult,
  getRawNotamsForAnalysis,
  isExtractionReadyJobStatus,
  type FlightExtractionDetails,
  type RawNotam,
} from "@/lib/flights";
import { createClient } from "@/lib/supabase/client";

const TERMINAL_JOB_STATUSES = ["complete", "failed"] as const;

type FlightExtractionDetailsProps = {
  flightId: string;
  initialDetails: FlightExtractionDetails;
  jobId: string;
};

type AnalysisJob = {
  status: string;
};

const EXTRACTION_FIELDS: {
  key: keyof FlightExtractionDetails;
  label: string;
}[] = [
  { key: "departure_icao", label: "Departure ICAO" },
  { key: "arrival_icao", label: "Arrival ICAO" },
  { key: "source_app", label: "Source app" },
  { key: "route", label: "Route" },
  { key: "cruise_level", label: "Cruise level" },
  { key: "dept_rwy", label: "Departure runway" },
  { key: "arr_rwy", label: "Arrival runway" },
  { key: "planned_dept_time", label: "Planned departure time" },
  { key: "planned_arr_time", label: "Planned arrival time" },
  { key: "alt_icao", label: "Alternate ICAO" },
];

/**
 * Returns whether an analysis job has reached a terminal status.
 */
function isTerminalJobStatus(status: string): boolean {
  return TERMINAL_JOB_STATUSES.includes(
    status as (typeof TERMINAL_JOB_STATUSES)[number],
  );
}

/**
 * Formats an extracted value for display.
 */
function formatExtractedValue(value: string | null): string {
  return value?.trim() ? value : "Not extracted yet";
}

/**
 * Tracks analysis job status and loads extracted fields once extraction completes.
 */
export function FlightExtractionDetailsSection({
  flightId,
  initialDetails,
  jobId,
}: FlightExtractionDetailsProps) {
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [details, setDetails] = useState(initialDetails);
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
    setDetails(result.details);
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

  return (
    <>
      <section>
        <h2>Flight analysis</h2>
        <p>Status: {jobStatus ?? "Loading..."}</p>
      </section>

      {showExtraction ? (
        <>
          <section>
            <h2>Extracted flight plan</h2>
            <dl>
              {EXTRACTION_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{formatExtractedValue(details[key])}</dd>
                </div>
              ))}
            </dl>
          </section>
          <RawNotamsList notams={notams} />
        </>
      ) : null}
    </>
  );
}
