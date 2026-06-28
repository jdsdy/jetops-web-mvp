"use client";

import { Fragment, useMemo, useState } from "react";

import {
  NotamCategoryPill,
  formatNotamCategoryLabel,
} from "@/app/app/organisation/[organisationId]/flights/_components/notam-category-pill";
import { NotamDetail } from "@/app/app/organisation/[organisationId]/flights/_components/notam-detail";
import { NotamFeedbackForm } from "@/app/app/organisation/[organisationId]/flights/_components/notam-feedback-form";
import { NotamRowChevron } from "@/app/app/organisation/[organisationId]/flights/_components/notam-row-chevron";
import {
  portalCardClassName,
  portalMobileListClassName,
  portalTableBodyClassName,
  portalTableClassName,
  portalTableHeadClassName,
  portalTdClassName,
  portalThClassName,
} from "@/components/portal-styles";
import { SectionHeader } from "@/components/section-header";
import type {
  AnalysedNotam,
  AnalysedNotamCategoryGroup,
  RawNotam,
} from "@/lib/flights";

type AnalysedNotamsListProps = {
  flightsApiBasePath: string;
  flightId: string;
  flightPlanId: string;
  groups: AnalysedNotamCategoryGroup[];
  pendingCount?: number;
  failedNotams?: AnalysedNotam[];
  unclassifiedNotams?: RawNotam[];
};

type NotamTableRow = {
  rowKey: string;
  notamId: string;
  analysedNotamId?: number;
  categoryKey: string;
  categoryNumber?: number;
  categoryLabel: string;
  categoryVariant: "category" | "failed" | "unclassified";
  summary: string | null;
  detailNotam: RawNotam;
  detailSummary: string | null;
  showFailedMessage: boolean;
};

const ALL_CATEGORIES_FILTER = "all";

/**
 * Builds flat table rows from analysed NOTAM snapshot data.
 */
function buildNotamTableRows(
  groups: AnalysedNotamCategoryGroup[],
  failedNotams: AnalysedNotam[],
  unclassifiedNotams: RawNotam[],
): NotamTableRow[] {
  const classifiedRows = groups.flatMap((group) =>
    group.notams.map((notam) => ({
      rowKey: `classified-${notam.id}`,
      notamId: notam.raw_notam.notam_id,
      analysedNotamId: notam.id,
      categoryKey: String(group.category),
      categoryNumber: group.category,
      categoryLabel: formatNotamCategoryLabel(group.category),
      categoryVariant: "category" as const,
      summary: notam.summary,
      detailNotam: notam.raw_notam,
      detailSummary: notam.summary,
      showFailedMessage: false,
    })),
  );

  const failedRows = failedNotams.map((notam) => ({
    rowKey: `failed-${notam.id}`,
    notamId: notam.raw_notam.notam_id,
    analysedNotamId: notam.id,
    categoryKey: "failed",
    categoryLabel: "Failed",
    categoryVariant: "failed" as const,
    summary: notam.summary,
    detailNotam: notam.raw_notam,
    detailSummary: notam.summary,
    showFailedMessage: true,
  }));

  const unclassifiedRows = unclassifiedNotams.map((notam) => ({
    rowKey: `unclassified-${notam.id}`,
    notamId: notam.notam_id,
    categoryKey: "unclassified",
    categoryLabel: "Unclassified",
    categoryVariant: "unclassified" as const,
    summary: notam.title,
    detailNotam: notam,
    detailSummary: null,
    showFailedMessage: false,
  }));

  return [...classifiedRows, ...failedRows, ...unclassifiedRows];
}

/**
 * Collects unique category filter options from table rows.
 */
function buildCategoryFilters(rows: NotamTableRow[]): { key: string; label: string }[] {
  const categories = new Map<string, string>();

  for (const row of rows) {
    if (row.categoryVariant === "category") {
      categories.set(row.categoryKey, row.categoryLabel);
    }
  }

  const sortedCategories = [...categories.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([key, label]) => ({ key, label }));

  const filters: { key: string; label: string }[] = [
    { key: ALL_CATEGORIES_FILTER, label: "All" },
    ...sortedCategories,
  ];

  if (rows.some((row) => row.categoryKey === "failed")) {
    filters.push({ key: "failed", label: "Failed" });
  }

  if (rows.some((row) => row.categoryKey === "unclassified")) {
    filters.push({ key: "unclassified", label: "Unclassified" });
  }

  return filters;
}

/**
 * Toggles a row key in the expanded set.
 */
function toggleExpandedRowKey(
  expandedRowKeys: Set<string>,
  rowKey: string,
): Set<string> {
  const next = new Set(expandedRowKeys);

  if (next.has(rowKey)) {
    next.delete(rowKey);
  } else {
    next.add(rowKey);
  }

  return next;
}

/**
 * Expanded NOTAM detail and optional feedback form.
 */
function NotamExpandedContent({
  row,
  flightsApiBasePath,
  flightId,
  flightPlanId,
}: {
  row: NotamTableRow;
  flightsApiBasePath: string;
  flightId: string;
  flightPlanId: string;
}) {
  return (
    <div className="space-y-4">
      <NotamDetail
        notam={row.detailNotam}
        showFailedMessage={row.showFailedMessage}
      />
      {row.analysedNotamId ? (
        <NotamFeedbackForm
          flightsApiBasePath={flightsApiBasePath}
          flightId={flightId}
          flightPlanId={flightPlanId}
          analysedNotamId={row.analysedNotamId}
        />
      ) : null}
    </div>
  );
}

/**
 * Expandable NOTAM table with category filtering.
 */
export function AnalysedNotamsList({
  flightsApiBasePath,
  flightId,
  flightPlanId,
  groups,
  pendingCount = 0,
  failedNotams = [],
  unclassifiedNotams = [],
}: AnalysedNotamsListProps) {
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_FILTER);

  const rows = useMemo(
    () => buildNotamTableRows(groups, failedNotams, unclassifiedNotams),
    [groups, failedNotams, unclassifiedNotams],
  );

  const categoryFilters = useMemo(() => buildCategoryFilters(rows), [rows]);

  const filteredRows =
    categoryFilter === ALL_CATEGORIES_FILTER
      ? rows
      : rows.filter((row) => row.categoryKey === categoryFilter);

  const classifiedCount = groups.reduce(
    (count, group) => count + group.notams.length,
    0,
  );

  function handleCategoryFilterChange(nextFilter: string) {
    setCategoryFilter(nextFilter);
    setExpandedRowKeys(new Set());
  }

  if (rows.length === 0 && pendingCount === 0) {
    return (
      <div className={portalCardClassName}>
        <SectionHeader
          title="NOTAMs"
          description="Analysed NOTAMs will appear here when classification completes."
        />
        <p className="text-sm text-aviation-slate">No analysed NOTAMs yet.</p>
      </div>
    );
  }

  const descriptionParts: string[] = [];

  if (classifiedCount > 0) {
    descriptionParts.push(
      `${classifiedCount} ${classifiedCount === 1 ? "NOTAM" : "NOTAMs"} classified`,
    );
  }

  if (pendingCount > 0) {
    descriptionParts.push(
      `${pendingCount} ${pendingCount === 1 ? "NOTAM" : "NOTAMs"} still processing`,
    );
  }

  if (failedNotams.length > 0) {
    descriptionParts.push(
      `${failedNotams.length} ${failedNotams.length === 1 ? "failure" : "failures"}`,
    );
  }

  return (
    <div className={portalCardClassName}>
      <SectionHeader
        title="NOTAMs"
        description={
          descriptionParts.length > 0
            ? descriptionParts.join(" · ")
            : "Review classified NOTAMs for this flight."
        }
      />

      {categoryFilters.length > 2 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {categoryFilters.map((filter) => {
            const isActive = categoryFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => handleCategoryFilterChange(filter.key)}
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-aviation-navy text-white"
                    : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {filteredRows.length === 0 ? (
        <p className="text-sm text-aviation-slate">
          No NOTAMs match the selected category.
        </p>
      ) : (
        <>
          <ul className={portalMobileListClassName}>
            {filteredRows.map((row) => {
              const isExpanded = expandedRowKeys.has(row.rowKey);

              return (
                <li key={row.rowKey}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-1 py-4 text-left hover:bg-neutral-50"
                    onClick={() =>
                      setExpandedRowKeys((current) =>
                        toggleExpandedRowKey(current, row.rowKey),
                      )
                    }
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <NotamCategoryPill
                        label={row.categoryLabel}
                        variant={row.categoryVariant}
                        category={row.categoryNumber}
                      />
                      <p className="font-medium text-neutral-900">{row.notamId}</p>
                      <p className="text-sm whitespace-normal text-aviation-slate">
                        {row.summary?.trim() ? row.summary : "—"}
                      </p>
                    </div>
                    <NotamRowChevron expanded={isExpanded} />
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-neutral-200 bg-neutral-50 px-1 py-4">
                      <NotamExpandedContent
                        row={row}
                        flightsApiBasePath={flightsApiBasePath}
                        flightId={flightId}
                        flightPlanId={flightPlanId}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className={portalTableClassName}>
              <thead className={portalTableHeadClassName}>
                <tr>
                  <th className={portalThClassName}>NOTAM ID</th>
                  <th className={portalThClassName}>Category</th>
                  <th className={portalThClassName}>Summary</th>
                  <th className={`${portalThClassName} w-10`}>
                    <span className="sr-only">Expand</span>
                  </th>
                </tr>
              </thead>
              <tbody className={portalTableBodyClassName}>
                {filteredRows.map((row) => {
                  const isExpanded = expandedRowKeys.has(row.rowKey);

                  return (
                    <Fragment key={row.rowKey}>
                      <tr
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() =>
                          setExpandedRowKeys((current) =>
                            toggleExpandedRowKey(current, row.rowKey),
                          )
                        }
                        aria-expanded={isExpanded}
                      >
                        <td className={`${portalTdClassName} font-medium whitespace-nowrap`}>
                          {row.notamId}
                        </td>
                        <td className={`${portalTdClassName} whitespace-nowrap`}>
                          <NotamCategoryPill
                            label={row.categoryLabel}
                            variant={row.categoryVariant}
                            category={row.categoryNumber}
                          />
                        </td>
                        <td
                          className={`${portalTdClassName} max-w-md whitespace-normal text-aviation-slate`}
                        >
                          {row.summary?.trim() ? row.summary : "—"}
                        </td>
                        <td className={`${portalTdClassName} w-10 text-right`}>
                          <NotamRowChevron expanded={isExpanded} />
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-neutral-50">
                          <td colSpan={4} className="px-4 py-4">
                            <NotamExpandedContent
                              row={row}
                              flightsApiBasePath={flightsApiBasePath}
                              flightId={flightId}
                              flightPlanId={flightPlanId}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
