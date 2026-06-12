type AnalysisStatusBadgeProps = {
  status: string;
};

const statusLabels: Record<string, string> = {
  processing_extraction: "Extracting",
  awaiting_confirmation: "Awaiting confirmation",
  processing_analysis: "Analysing",
  retrying: "Analysing",
  finished: "Complete",
  partial_finish: "Complete with gaps",
  complete: "Extracted",
  failed: "Failed",
};

const statusClassNames: Record<string, string> = {
  processing_extraction: "bg-aviation-blue/10 text-aviation-blue",
  awaiting_confirmation: "bg-amber-50 text-amber-900",
  processing_analysis: "bg-aviation-blue/10 text-aviation-blue",
  retrying: "bg-aviation-blue/10 text-aviation-blue",
  finished: "bg-emerald-50 text-emerald-800",
  partial_finish: "bg-amber-50 text-amber-900",
  complete: "bg-neutral-100 text-aviation-navy",
  failed: "bg-red-50 text-red-800",
};

/**
 * Compact human-readable badge for the current analysis job status.
 */
export function AnalysisStatusBadge({ status }: AnalysisStatusBadgeProps) {
  const label = statusLabels[status] ?? status.replaceAll("_", " ");
  const className =
    statusClassNames[status] ?? "bg-neutral-100 text-aviation-navy";

  return (
    <span
      className={`inline-flex rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
