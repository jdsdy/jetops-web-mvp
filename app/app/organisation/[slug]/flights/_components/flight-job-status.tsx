"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const TERMINAL_JOB_STATUSES = ["complete", "failed"] as const;

type FlightJobStatusProps = {
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
 * Tracks an analysis job via Realtime updates with an initial fetch fallback.
 */
export function FlightJobStatus({ jobId }: FlightJobStatusProps) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function applyJobStatus(nextStatus: string) {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
    }

    const channel = supabase
      .channel(`job-${jobId}`)
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
          applyJobStatus(updatedJob.status);

          if (isTerminalJobStatus(updatedJob.status)) {
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

      applyJobStatus(job.status);

      if (isTerminalJobStatus(job.status)) {
        void supabase.removeChannel(channel);
      }
    })();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [jobId]);

  return (
    <section>
      <h2>Flight analysis</h2>
      <p>Status: {status ?? "Loading..."}</p>
    </section>
  );
}
