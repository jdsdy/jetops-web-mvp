import { hasRawNotamFieldValue } from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import type { RawNotam } from "@/lib/flights";

type NotamDetailProps = {
  notam: RawNotam;
  showFailedMessage?: boolean;
};

type NotamFieldProps = {
  label: string;
  value: string;
};

/**
 * Splits a NOTAM Q line into segments that wrap at slash boundaries.
 */
function splitNotamQLineSegments(qLine: string): string[] {
  const parts = qLine.split("/");

  return parts.map((part, index) =>
    index < parts.length - 1 ? `${part}/` : part,
  );
}

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
 * NOTAM Q field with wrapping at slash-delimited segments.
 */
function NotamQField({ value }: { value: string }) {
  const segments = splitNotamQLineSegments(value);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-aviation-slate">
        Q
      </p>
      <p className="mt-1 text-sm text-neutral-900">
        {segments.map((segment, index) => (
          <span key={index} className="inline-block max-w-full">
            {segment}
          </span>
        ))}
      </p>
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
  showFailedMessage = false,
}: NotamDetailProps) {
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
    hasTitle || hasQ || hasA || hasB || hasC || hasD || hasE || hasF || hasG;

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

      {hasTitle ? <NotamField label="Title" value={notam.title!} /> : null}
      {hasQ ? <NotamQField value={notam.q!} /> : null}
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
