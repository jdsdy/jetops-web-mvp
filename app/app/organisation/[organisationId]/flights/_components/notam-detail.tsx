import { hasRawNotamFieldValue } from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import type { RawNotam } from "@/lib/flights";

type NotamDetailProps = {
  notam: RawNotam;
  summary?: string | null;
  showFailedMessage?: boolean;
};

type NotamFieldProps = {
  label: string;
  value: string;
};

/**
 * Single NOTAM field with label and pre-wrapped value.
 */
function NotamField({ label, value }: NotamFieldProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-aviation-slate">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{value}</p>
    </div>
  );
}

/**
 * Pair of NOTAM fields displayed side by side on wider viewports.
 */
function NotamFieldPair({
  left,
  right,
}: {
  left: NotamFieldProps | null;
  right: NotamFieldProps | null;
}) {
  if (!left && !right) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
      {left ? <NotamField {...left} /> : null}
      {right ? <NotamField {...right} /> : null}
    </div>
  );
}

/**
 * Full NOTAM detail in standard briefing order.
 */
export function NotamDetail({
  notam,
  summary,
  showFailedMessage = false,
}: NotamDetailProps) {
  const hasSummary = Boolean(summary?.trim());
  const hasTitle = hasRawNotamFieldValue(notam.title);
  const hasQ = hasRawNotamFieldValue(notam.q);
  const hasA = hasRawNotamFieldValue(notam.a);
  const hasB = hasRawNotamFieldValue(notam.b);
  const hasC = hasRawNotamFieldValue(notam.c);
  const hasD = hasRawNotamFieldValue(notam.d);
  const hasE = hasRawNotamFieldValue(notam.e);
  const hasF = hasRawNotamFieldValue(notam.f);
  const hasG = hasRawNotamFieldValue(notam.g);

  const hasContent =
    hasSummary ||
    hasTitle ||
    hasQ ||
    hasA ||
    hasB ||
    hasC ||
    hasD ||
    hasE ||
    hasF ||
    hasG;

  if (!hasContent && !showFailedMessage) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showFailedMessage ? (
        <p className="text-sm text-red-800">
          Analysis could not classify this NOTAM after retries.
        </p>
      ) : null}

      {hasSummary ? <NotamField label="Summary" value={summary!} /> : null}
      {hasTitle ? <NotamField label="Title" value={notam.title!} /> : null}
      {hasQ ? <NotamField label="Q" value={notam.q!} /> : null}
      {hasA ? <NotamField label="A" value={notam.a!} /> : null}

      <NotamFieldPair
        left={hasB ? { label: "B", value: notam.b! } : null}
        right={hasC ? { label: "C", value: notam.c! } : null}
      />

      <NotamFieldPair
        left={hasF ? { label: "F", value: notam.f! } : null}
        right={hasG ? { label: "G", value: notam.g! } : null}
      />

      {hasD ? <NotamField label="D" value={notam.d!} /> : null}
      {hasE ? <NotamField label="E" value={notam.e!} /> : null}
    </div>
  );
}
