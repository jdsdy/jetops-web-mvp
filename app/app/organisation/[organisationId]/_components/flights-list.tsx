"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  portalTableBodyClassName,
  portalTableClassName,
  portalTableHeadClassName,
  portalLinkClassName,
  portalTdClassName,
  portalThClassName,
} from "@/components/portal-styles";
import { formatPortalDate } from "@/lib/format";
import type { OrganisationFlightListItem } from "@/lib/flights";

type FlightsListProps = {
  analysisPageBasePath: string;
  flights: OrganisationFlightListItem[];
};

const mobileHiddenColumnClassName = "hidden md:table-cell";

/**
 * Formats a flight route label for the organisation flights list.
 */
function formatRoute(flight: OrganisationFlightListItem): string {
  if (flight.departure_icao && flight.arrival_icao) {
    return `${flight.departure_icao} → ${flight.arrival_icao}`;
  }

  return "—";
}

/**
 * Formats aircraft details for a flight row.
 */
function formatAircraft(flight: OrganisationFlightListItem): string {
  if (flight.tail_number && flight.model) {
    return `${flight.tail_number} — ${flight.model}`;
  }

  if (flight.tail_number) {
    return flight.tail_number;
  }

  return "—";
}

/**
 * Builds the flight status page URL when an analysis job exists.
 */
function buildFlightPageHref(
  analysisPageBasePath: string,
  flight: OrganisationFlightListItem,
): string | null {
  if (!flight.job_id) {
    return null;
  }

  return `${analysisPageBasePath}?id=${flight.id}&jobId=${flight.job_id}`;
}

/**
 * Displays flights in a table with links to the analysis page.
 */
export function FlightsList({ analysisPageBasePath, flights }: FlightsListProps) {
  const router = useRouter();

  if (flights.length === 0) {
    return (
      <p className="text-sm text-aviation-slate">
        No flights yet. Add a flight to upload a flight plan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={portalTableClassName}>
        <thead className={portalTableHeadClassName}>
          <tr>
            <th className={portalThClassName}>Route</th>
            <th className={portalThClassName}>Aircraft</th>
            <th className={`${portalThClassName} ${mobileHiddenColumnClassName}`}>
              Status
            </th>
            <th className={portalThClassName}>Created</th>
            <th className={`${portalThClassName} ${mobileHiddenColumnClassName}`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className={portalTableBodyClassName}>
          {flights.map((flight) => {
            const href = buildFlightPageHref(analysisPageBasePath, flight);
            const status = flight.job_status ?? flight.status ?? "Unknown";

            return (
              <tr
                key={flight.id}
                className={
                  href
                    ? "cursor-pointer hover:bg-neutral-50 active:bg-neutral-100 md:cursor-default md:active:bg-transparent"
                    : "hover:bg-neutral-50"
                }
                onClick={() => {
                  if (href && window.matchMedia("(max-width: 767px)").matches) {
                    router.push(href);
                  }
                }}
              >
                <td className={portalTdClassName}>{formatRoute(flight)}</td>
                <td className={portalTdClassName}>{formatAircraft(flight)}</td>
                <td className={`${portalTdClassName} ${mobileHiddenColumnClassName}`}>
                  {status}
                </td>
                <td className={portalTdClassName}>
                  {formatPortalDate(flight.created_at)}
                </td>
                <td
                  className={`${portalTdClassName} ${mobileHiddenColumnClassName}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {href ? (
                    <Link href={href} className={portalLinkClassName}>
                      View analysis
                    </Link>
                  ) : (
                    <span className="text-aviation-slate">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
