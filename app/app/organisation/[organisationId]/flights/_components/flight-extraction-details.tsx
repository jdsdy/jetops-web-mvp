"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AnalysedNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/analysed-notams-list";
import { FlightExtractionForm } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-form";
import { RawNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import {
  getAnalysedNotamsForAnalysis,
  getFlightExtractionResult,
  getRawNotamsForAnalysis,
  isAnalysisFinishedJobStatus,
  isAnalysisInProgressJobStatus,
  isAnalysisJobPollingStatus,
  isExtractionReadyJobStatus,
  isFlightExtractionEditableJobStatus,
  type AnalysedNotamCategoryGroup,
  type FlightExtractionDetails,
  type RawNotam,
} from "@/lib/flights";
import { createClient } from "@/lib/supabase/client";

const JOB_STATUS_POLL_INTERVAL_MS = 3000;

type FlightExtractionDetailsProps = {
  organisationId: string;
  flightId: string;
  flightPlanId: string;
  initialDetails: FlightExtractionDetails;
  jobId: string;
};

type FlightJobStatusResponse = {
  status?: string;
};

/**
 * Tracks analysis job status and loads extracted fields once extraction completes.
 */
export function FlightExtractionDetailsSection({
  organisationId,
  flightId,
  flightPlanId: initialFlightPlanId,
  initialDetails,
  jobId,
}: FlightExtractionDetailsProps) {
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [savedDetails, setSavedDetails] = useState(initialDetails);
  const [flightPlanId, setFlightPlanId] = useState(initialFlightPlanId);
  const [notams, setNotams] = useState<RawNotam[]>([]);
  const [analysedNotamGroups, setAnalysedNotamGroups] = useState<
    AnalysedNotamCategoryGroup[]
  >([]);
  const [showExtraction, setShowExtraction] = useState(false);
  const [showAnalysedNotams, setShowAnalysedNotams] = useState(false);
  const [analysisBegun, setAnalysisBegun] = useState(false);
  const [pollingTrigger, setPollingTrigger] = useState(0);
  const extractionLoadedRef = useRef(false);
  const analysedLoadedRef = useRef(false);

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
    setFlightPlanId(result.flightPlanId);
    setNotams(nextNotams);
    setShowExtraction(true);
  }, [flightId, jobId]);

  const loadAnalysedNotams = useCallback(async (planId: string) => {
    const supabase = createClient();
    const groups = await getAnalysedNotamsForAnalysis(supabase, jobId, planId);

    analysedLoadedRef.current = true;
    setAnalysedNotamGroups(groups);
    setShowAnalysedNotams(true);
  }, [jobId]);

  const handleJobStatus = useCallback(
    (nextStatus: string, previousStatus: string | null) => {
      setJobStatus(nextStatus);

      if (
        isExtractionReadyJobStatus(nextStatus) &&
        !extractionLoadedRef.current
      ) {
        const shouldLoadExtraction =
          previousStatus === null ||
          (previousStatus === "processing_extraction" &&
            nextStatus === "awaiting_confirmation");

        if (shouldLoadExtraction) {
          void loadExtractionDetails();
        }
      }

      if (isAnalysisFinishedJobStatus(nextStatus) && !analysedLoadedRef.current) {
        const planId = flightPlanId || initialFlightPlanId;

        if (planId) {
          void loadAnalysedNotams(planId);
        }

        setAnalysisBegun(false);
      }
    },
    [
      flightPlanId,
      initialFlightPlanId,
      loadAnalysedNotams,
      loadExtractionDetails,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    let previousStatus: string | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function fetchJobStatus(): Promise<string | null> {
      try {
        const params = new URLSearchParams({ jobId });
        const response = await fetch(
          `/api/organisations/${encodeURIComponent(organisationId)}/flights/${encodeURIComponent(flightId)}?${params.toString()}`,
        );

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as FlightJobStatusResponse;
        return typeof data.status === "string" ? data.status : null;
      } catch {
        return null;
      }
    }

    function applyJobStatus(nextStatus: string) {
      if (cancelled) {
        return;
      }

      if (isAnalysisInProgressJobStatus(nextStatus)) {
        setAnalysisBegun(true);
      }

      handleJobStatus(nextStatus, previousStatus);
      previousStatus = nextStatus;
    }

    async function pollOnce(): Promise<boolean> {
      const nextStatus = await fetchJobStatus();

      if (!nextStatus) {
        return false;
      }

      applyJobStatus(nextStatus);
      return isAnalysisJobPollingStatus(nextStatus);
    }

    void (async () => {
      const shouldKeepPolling = await pollOnce();

      if (cancelled || !shouldKeepPolling) {
        return;
      }

      intervalId = setInterval(() => {
        void (async () => {
          const keepPolling = await pollOnce();

          if (!keepPolling && intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
          }
        })();
      }, JOB_STATUS_POLL_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;

      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [organisationId, flightId, jobId, handleJobStatus, pollingTrigger]);

  useEffect(() => {
    if (
      !isAnalysisFinishedJobStatus(jobStatus ?? "") ||
      analysedLoadedRef.current ||
      !flightPlanId
    ) {
      return;
    }

    void loadAnalysedNotams(flightPlanId);
  }, [flightPlanId, jobStatus, loadAnalysedNotams]);

  const editable =
    jobStatus !== null && isFlightExtractionEditableJobStatus(jobStatus);

  const showAnalysisInProgress =
    !showAnalysedNotams &&
    (analysisBegun ||
      (jobStatus !== null && isAnalysisInProgressJobStatus(jobStatus)));

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
            flightPlanId={flightPlanId}
            jobId={jobId}
            savedDetails={savedDetails}
            editable={editable}
            onSaved={setSavedDetails}
            onAnalysisBegun={() => {
              setAnalysisBegun(true);
              setPollingTrigger((count) => count + 1);
            }}
          />
          <RawNotamsList notams={notams} />
        </>
      ) : null}

      {showAnalysisInProgress ? (
        <section>
          <h2>NOTAM analysis</h2>
          <p>Analysis in progress. Results will appear here when complete.</p>
        </section>
      ) : null}

      {showAnalysedNotams ? (
        <AnalysedNotamsList groups={analysedNotamGroups} />
      ) : null}
    </>
  );
}
