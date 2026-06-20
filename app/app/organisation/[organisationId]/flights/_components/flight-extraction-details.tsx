"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AnalysisProgressPanel } from "@/app/app/organisation/[organisationId]/flights/_components/analysis-progress-panel";
import { AnalysisStatusBadge } from "@/app/app/organisation/[organisationId]/flights/_components/analysis-status-badge";
import { AnalysedNotamsList } from "@/app/app/organisation/[organisationId]/flights/_components/analysed-notams-list";
import { FlightExtractionForm } from "@/app/app/organisation/[organisationId]/flights/_components/flight-extraction-form";
import { portalLinkClassName } from "@/components/portal-styles";
import {
  getFlightAnalysedNotamsSnapshot,
  getFlightExtractionResult,
  getRawNotamsForAnalysis,
  isAnalysisFailedJobStatus,
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
  flightsApiBasePath: string;
  flightId: string;
  flightPlanId: string;
  initialDetails: FlightExtractionDetails;
  jobId: string;
  initialJobStatus: string;
  initialAnalysedSnapshot: FlightAnalysedNotamsSnapshot | null;
  initialRawNotams: RawNotam[];
  appHomePath: string;
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
    isAnalysisPartialFinishJobStatus(status) ||
    isAnalysisFailedJobStatus(status)
  ) {
    setters.setAnalysisBegun(false);
  }
}

/**
 * Tracks analysis job status and loads extracted fields once extraction completes.
 */
export function FlightExtractionDetailsSection({
  flightsApiBasePath,
  flightId,
  flightPlanId: initialFlightPlanId,
  initialDetails,
  jobId,
  initialJobStatus,
  initialAnalysedSnapshot,
  initialRawNotams,
  appHomePath,
}: FlightExtractionDetailsProps) {
  const extractionReadyInitially = isExtractionReadyJobStatus(initialJobStatus);
  const resultsReadyInitially = isAnalysisResultsReadyJobStatus(initialJobStatus);
  const analysisActiveInitially =
    isAnalysisInProgressJobStatus(initialJobStatus) ||
    isAnalysisRetryingJobStatus(initialJobStatus);

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
  const [analysisBegun, setAnalysisBegun] = useState(analysisActiveInitially);
  const [pollingTrigger, setPollingTrigger] = useState(0);
  const [extractionStartedAt, setExtractionStartedAt] = useState<number | null>(
    initialJobStatus === "processing_extraction" ? Date.now() : null,
  );
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(
    analysisActiveInitially ? Date.now() : null,
  );
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

      if (nextStatus === "processing_extraction" && !extractionStartedAt) {
        setExtractionStartedAt(Date.now());
      }

      if (
        (isAnalysisInProgressJobStatus(nextStatus) ||
          isAnalysisRetryingJobStatus(nextStatus)) &&
        !analysisStartedAt
      ) {
        setAnalysisStartedAt(Date.now());
      }

      if (isAnalysisFailedJobStatus(nextStatus)) {
        setAnalysisBegun(false);
      }

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
      analysisStartedAt,
      extractionStartedAt,
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
          `${flightsApiBasePath}/${encodeURIComponent(flightId)}?${params.toString()}`,
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
    flightsApiBasePath,
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

  const showExtractionProgress = jobStatus === "processing_extraction";

  const analysisFailed = isAnalysisFailedJobStatus(jobStatus);

  const showAnalysisInProgress =
    !showAnalysedNotams &&
    !analysisFailed &&
    (analysisBegun ||
      isAnalysisInProgressJobStatus(jobStatus) ||
      isAnalysisRetryingJobStatus(jobStatus));

  const showAnalysisFailed = !showAnalysedNotams && analysisFailed;

  const classifiedCount = analysedNotamGroups.reduce(
    (count, group) => count + group.notams.length,
    0,
  );
  const totalNotams =
    notams.length ||
    classifiedCount + pendingAnalysedNotamCount + failedNotams.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={appHomePath} className={portalLinkClassName}>
          ← Back to flights
        </Link>
        <AnalysisStatusBadge status={jobStatus} />
      </div>

      {showExtractionProgress ? (
        <AnalysisProgressPanel phase="extraction" startedAt={extractionStartedAt} />
      ) : null}

      {showExtraction ? (
        <FlightExtractionForm
          flightsApiBasePath={flightsApiBasePath}
          flightId={flightId}
          flightPlanId={flightPlanId}
          jobId={jobId}
          savedDetails={savedDetails}
          editable={editable}
          onSaved={setSavedDetails}
          onAnalysisBegun={() => {
            setAnalysisBegun(true);
            setAnalysisStartedAt(Date.now());
            setPollingTrigger((count) => count + 1);
          }}
        />
      ) : null}

      {showAnalysisFailed ? (
        <AnalysisProgressPanel phase="analysis" failed />
      ) : showAnalysisInProgress ? (
        <AnalysisProgressPanel
          phase="analysis"
          startedAt={analysisStartedAt}
          totalNotams={totalNotams}
          classifiedCount={classifiedCount}
          pendingCount={pendingAnalysedNotamCount}
        />
      ) : null}

      {showAnalysedNotams ? (
        <AnalysedNotamsList
          flightsApiBasePath={flightsApiBasePath}
          flightId={flightId}
          flightPlanId={flightPlanId}
          groups={analysedNotamGroups}
          pendingCount={pendingAnalysedNotamCount}
          failedNotams={failedNotams}
          unclassifiedNotams={unclassifiedNotams}
        />
      ) : null}
    </div>
  );
}
