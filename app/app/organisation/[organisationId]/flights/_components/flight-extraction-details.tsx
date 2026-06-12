"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AnalysedNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/analysed-notams-list";
import { FlightExtractionForm } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-form";
import { RawNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import {
  getFlightAnalysedNotamsSnapshot,
  getFlightExtractionResult,
  getRawNotamsForAnalysis,
  isAnalysisFinishedJobStatus,
  isAnalysisInProgressJobStatus,
  isAnalysisJobPollingStatus,
  isAnalysisPartialFinishJobStatus,
  isAnalysisResultsReadyJobStatus,
  isAnalysisRetryingJobStatus,
  isExtractionReadyJobStatus,
  isFlightExtractionEditableJobStatus,
  type AnalysedNotam,
  type AnalysedNotamCategoryGroup,
  type FlightAnalysedNotamsSnapshot,
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
  initialJobStatus: string;
  initialAnalysedSnapshot: FlightAnalysedNotamsSnapshot | null;
  initialRawNotams: RawNotam[];
};

type FlightJobStatusResponse = {
  status?: string;
};

/**
 * Applies an analysed NOTAM snapshot to component state.
 */
function applyAnalysedSnapshot(
  snapshot: FlightAnalysedNotamsSnapshot,
  status: string,
  setters: {
    setAnalysedNotamGroups: (groups: AnalysedNotamCategoryGroup[]) => void;
    setPendingAnalysedNotamCount: (count: number) => void;
    setFailedNotams: (notams: AnalysedNotam[]) => void;
    setUnclassifiedNotams: (notams: RawNotam[]) => void;
    setShowAnalysedNotams: (show: boolean) => void;
    setAnalysisBegun: (begun: boolean) => void;
  },
) {
  setters.setAnalysedNotamGroups(snapshot.classifiedGroups);
  setters.setPendingAnalysedNotamCount(snapshot.pendingCount);
  setters.setFailedNotams(snapshot.failedNotams);
  setters.setUnclassifiedNotams(snapshot.unclassifiedRawNotams);
  setters.setShowAnalysedNotams(isAnalysisResultsReadyJobStatus(status));

  if (
    isAnalysisFinishedJobStatus(status) ||
    isAnalysisPartialFinishJobStatus(status)
  ) {
    setters.setAnalysisBegun(false);
  }
}

/**
 * Tracks analysis job status and loads extracted fields once extraction completes.
 */
export function FlightExtractionDetailsSection({
  organisationId,
  flightId,
  flightPlanId: initialFlightPlanId,
  initialDetails,
  jobId,
  initialJobStatus,
  initialAnalysedSnapshot,
  initialRawNotams,
}: FlightExtractionDetailsProps) {
  const extractionReadyInitially = isExtractionReadyJobStatus(initialJobStatus);
  const resultsReadyInitially = isAnalysisResultsReadyJobStatus(initialJobStatus);

  const [jobStatus, setJobStatus] = useState<string>(initialJobStatus);
  const [savedDetails, setSavedDetails] = useState(initialDetails);
  const [flightPlanId, setFlightPlanId] = useState(initialFlightPlanId);
  const [notams, setNotams] = useState<RawNotam[]>(initialRawNotams);
  const [analysedNotamGroups, setAnalysedNotamGroups] = useState(
    initialAnalysedSnapshot?.classifiedGroups ?? [],
  );
  const [pendingAnalysedNotamCount, setPendingAnalysedNotamCount] = useState(
    initialAnalysedSnapshot?.pendingCount ?? 0,
  );
  const [failedNotams, setFailedNotams] = useState<AnalysedNotam[]>(
    initialAnalysedSnapshot?.failedNotams ?? [],
  );
  const [unclassifiedNotams, setUnclassifiedNotams] = useState<RawNotam[]>(
    initialAnalysedSnapshot?.unclassifiedRawNotams ?? [],
  );
  const [showExtraction, setShowExtraction] = useState(extractionReadyInitially);
  const [showAnalysedNotams, setShowAnalysedNotams] =
    useState(resultsReadyInitially);
  const [analysisBegun, setAnalysisBegun] = useState(
    isAnalysisInProgressJobStatus(initialJobStatus) ||
      isAnalysisRetryingJobStatus(initialJobStatus),
  );
  const [pollingTrigger, setPollingTrigger] = useState(0);
  const extractionLoadedRef = useRef(extractionReadyInitially);
  const analysedLoadedRef = useRef(
    resultsReadyInitially && !isAnalysisRetryingJobStatus(initialJobStatus),
  );

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

  const loadAnalysedNotams = useCallback(
    async (planId: string, status: string) => {
      const supabase = createClient();
      const snapshot = await getFlightAnalysedNotamsSnapshot(
        supabase,
        jobId,
        planId,
        { includeUnclassifiedRaw: isAnalysisPartialFinishJobStatus(status) },
      );

      if (!isAnalysisRetryingJobStatus(status)) {
        analysedLoadedRef.current = true;
      }

      applyAnalysedSnapshot(snapshot, status, {
        setAnalysedNotamGroups,
        setPendingAnalysedNotamCount,
        setFailedNotams,
        setUnclassifiedNotams,
        setShowAnalysedNotams,
        setAnalysisBegun,
      });
    },
    [jobId],
  );

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

      if (isAnalysisResultsReadyJobStatus(nextStatus)) {
        const planId = flightPlanId || initialFlightPlanId;
        const shouldLoadAnalysedNotams =
          planId &&
          (isAnalysisRetryingJobStatus(nextStatus) ||
            !analysedLoadedRef.current);

        if (shouldLoadAnalysedNotams) {
          void loadAnalysedNotams(planId, nextStatus);
        }
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
    let previousStatus: string | null = initialJobStatus;
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
      if (cancelled || nextStatus === previousStatus) {
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
        return isAnalysisJobPollingStatus(jobStatus);
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
  }, [
    organisationId,
    flightId,
    jobId,
    handleJobStatus,
    pollingTrigger,
    initialJobStatus,
    jobStatus,
  ]);

  useEffect(() => {
    if (
      !isAnalysisResultsReadyJobStatus(jobStatus) ||
      (!isAnalysisRetryingJobStatus(jobStatus) && analysedLoadedRef.current) ||
      !flightPlanId
    ) {
      return;
    }

    void loadAnalysedNotams(flightPlanId, jobStatus);
  }, [flightPlanId, jobStatus, loadAnalysedNotams]);

  const editable = isFlightExtractionEditableJobStatus(jobStatus);

  const showAnalysisInProgress =
    !showAnalysedNotams &&
    (analysisBegun ||
      isAnalysisInProgressJobStatus(jobStatus) ||
      isAnalysisRetryingJobStatus(jobStatus));

  return (
    <>
      <section>
        <h2>Flight analysis</h2>
        <p>Status: {jobStatus}</p>
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
        <AnalysedNotamsList
          groups={analysedNotamGroups}
          pendingCount={pendingAnalysedNotamCount}
          failedNotams={failedNotams}
          unclassifiedNotams={unclassifiedNotams}
        />
      ) : null}
    </>
  );
}
