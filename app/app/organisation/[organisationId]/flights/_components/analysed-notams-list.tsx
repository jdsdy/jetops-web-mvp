"use client";

import {
  hasRawNotamFieldValue,
  RAW_NOTAM_DISPLAY_FIELDS,
} from "@/app/app/organisation/[organisationId]/flights/_components/raw-notams-list";
import type { AnalysedNotamCategoryGroup } from "@/lib/flights";

type AnalysedNotamsListProps = {
  groups: AnalysedNotamCategoryGroup[];
};

/**
 * Shows analysed NOTAMs grouped by category with summaries and raw content.
 */
export function AnalysedNotamsList({ groups }: AnalysedNotamsListProps) {
  const totalCount = groups.reduce((count, group) => count + group.notams.length, 0);

  if (totalCount === 0) {
    return (
      <section>
        <h2>Analysed NOTAMs</h2>
        <p>No analysed NOTAMs yet.</p>
      </section>
    );
  }

  const countLabel = totalCount === 1 ? "NOTAM" : "NOTAMs";

  return (
    <section>
      <h2>Analysed NOTAMs</h2>
      <p>
        {totalCount} {countLabel} analysed across {groups.length}{" "}
        {groups.length === 1 ? "category" : "categories"}
      </p>

      {groups.map((group) => (
        <section key={group.category}>
          <h3>Category {group.category}</h3>
          <ul>
            {group.notams.map((notam) => (
              <li key={notam.id}>
                <h4>{notam.raw_notam.notam_id}</h4>
                <p>{notam.summary}</p>
                {notam.was_cached ? <p>Cached result</p> : null}
                <dl>
                  {RAW_NOTAM_DISPLAY_FIELDS.filter(({ key }) =>
                    hasRawNotamFieldValue(notam.raw_notam[key]),
                  ).map(({ key, label }) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd style={{ whiteSpace: "pre-wrap" }}>
                        {notam.raw_notam[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
