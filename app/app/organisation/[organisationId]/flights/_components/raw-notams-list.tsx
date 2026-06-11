"use client";

import { useState } from "react";

import type { RawNotam } from "@/lib/flights";

type RawNotamsListProps = {
  notams: RawNotam[];
};

const RAW_NOTAM_DISPLAY_FIELDS: {
  key: keyof Omit<RawNotam, "id" | "notam_id">;
  label: string;
}[] = [
  { key: "title", label: "Title" },
  { key: "q", label: "Q" },
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
  { key: "d", label: "D" },
  { key: "e", label: "E" },
  { key: "f", label: "F" },
  { key: "g", label: "G" },
];

export { RAW_NOTAM_DISPLAY_FIELDS };

/**
 * Returns whether a NOTAM field has displayable text.
 */
export function hasRawNotamFieldValue(value: string | null): boolean {
  return Boolean(value?.trim());
}

/**
 * Shows extracted NOTAM count with an expandable list of individual NOTAMs.
 */
export function RawNotamsList({ notams }: RawNotamsListProps) {
  const [expanded, setExpanded] = useState(false);
  const countLabel = notams.length === 1 ? "NOTAM" : "NOTAMs";

  return (
    <section>
      <h2>Extracted NOTAMs</h2>
      <p>
        {notams.length} {countLabel} extracted
      </p>
      {notams.length > 0 ? (
        <button type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Hide NOTAMs" : "Show NOTAMs"}
        </button>
      ) : null}
      {expanded ? (
        <ul>
          {notams.map((notam) => (
            <li key={notam.id}>
              <h3>{notam.notam_id}</h3>
              <dl>
                {RAW_NOTAM_DISPLAY_FIELDS.filter(({ key }) =>
                  hasRawNotamFieldValue(notam[key]),
                ).map(({ key, label }) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd style={{ whiteSpace: "pre-wrap" }}>{notam[key]}</dd>
                    </div>
                  ),
                )}
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
