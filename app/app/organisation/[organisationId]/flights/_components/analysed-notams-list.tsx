"use client";

import {
  hasRawNotamFieldValue,
  RAW_NOTAM_DISPLAY_FIELDS,
} from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import type {
  AnalysedNotam,
  AnalysedNotamCategoryGroup,
  RawNotam,
} from "@/lib/flights";

type AnalysedNotamsListProps = {
  groups: AnalysedNotamCategoryGroup[];
  pendingCount?: number;
  failedNotams?: AnalysedNotam[];
  unclassifiedNotams?: RawNotam[];
};

/**
 * Renders the raw NOTAM fields for an analysed or unclassified NOTAM.
 */
function RawNotamFields({ notam }: { notam: RawNotam }) {
  return (
    <dl>
      {RAW_NOTAM_DISPLAY_FIELDS.filter(({ key }) =>
        hasRawNotamFieldValue(notam[key]),
      ).map(({ key, label }) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd style={{ whiteSpace: "pre-wrap" }}>{notam[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Shows analysed NOTAMs grouped by category with summaries and raw content.
 */
export function AnalysedNotamsList({
  groups,
  pendingCount = 0,
  failedNotams = [],
  unclassifiedNotams = [],
}: AnalysedNotamsListProps) {
  const classifiedCount = groups.reduce(
    (count, group) => count + group.notams.length,
    0,
  );
  const totalCount =
    classifiedCount +
    pendingCount +
    failedNotams.length +
    unclassifiedNotams.length;

  if (totalCount === 0) {
    return (
      <section>
        <h2>Analysed NOTAMs</h2>
        <p>No analysed NOTAMs yet.</p>
      </section>
    );
  }

  const classifiedLabel = classifiedCount === 1 ? "NOTAM" : "NOTAMs";
  const pendingLabel = pendingCount === 1 ? "NOTAM" : "NOTAMs";
  const failedLabel = failedNotams.length === 1 ? "NOTAM" : "NOTAMs";
  const unclassifiedLabel =
    unclassifiedNotams.length === 1 ? "NOTAM" : "NOTAMs";

  return (
    <section>
      <h2>Analysed NOTAMs</h2>
      {classifiedCount > 0 ? (
        <p>
          {classifiedCount} {classifiedLabel} analysed across {groups.length}{" "}
          {groups.length === 1 ? "category" : "categories"}
        </p>
      ) : null}

      {pendingCount > 0 ? (
        <p>
          {pendingCount} {pendingLabel} still processing
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.category}>
          <h3>Category {group.category}</h3>
          <ul>
            {group.notams.map((notam) => (
              <li key={notam.id}>
                <h4>{notam.raw_notam.notam_id}</h4>
                {notam.summary ? <p>{notam.summary}</p> : null}
                <RawNotamFields notam={notam.raw_notam} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {failedNotams.length > 0 ? (
        <section>
          <h3>Failed NOTAMs</h3>
          <p>
            {failedNotams.length} {failedLabel} could not be analysed after
            retries.
          </p>
          <ul>
            {failedNotams.map((notam) => (
              <li key={notam.id}>
                <h4>{notam.raw_notam.notam_id}</h4>
                <p>Analysis failed for this NOTAM.</p>
                <RawNotamFields notam={notam.raw_notam} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unclassifiedNotams.length > 0 ? (
        <section>
          <h3>Unclassified NOTAMs</h3>
          <p>
            {unclassifiedNotams.length} {unclassifiedLabel} could not be
            classified and are shown from the extracted NOTAM text.
          </p>
          <ul>
            {unclassifiedNotams.map((notam) => (
              <li key={notam.id}>
                <h4>{notam.notam_id}</h4>
                <RawNotamFields notam={notam} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
