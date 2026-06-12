import Link from "next/link";

import { PortalTable } from "@/components/portal-table";
import { portalLinkClassName, portalTdClassName } from "@/components/portal-styles";
import { formatPortalDate } from "@/lib/format";
import type { OrganisationFlightListItem } from "@/lib/flights";

type FlightsListProps = {
  organisationId: string;
  flights: OrganisationFlightListItem[];
};

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
  organisationId: string,
  flight: OrganisationFlightListItem,
): string | null {
  if (!flight.job_id) {
    return null;
  }

  return `/app/organisation/${organisationId}/flights?id=${flight.id}&jobId=${flight.job_id}`;
}

/**
 * Displays organisation flights in a table with links to the analysis page.
 */
export function FlightsList({ organisationId, flights }: FlightsListProps) {
  if (flights.length === 0) {
    return (
      <p className="text-sm text-aviation-slate">
        No flights yet. Add a flight to upload a flight plan.
      </p>
    );
  }

  return (
    <PortalTable columns={["Route", "Aircraft", "Status", "Created", "Actions"]}>
      {flights.map((flight) => {
        const href = buildFlightPageHref(organisationId, flight);
        const status = flight.job_status ?? flight.status ?? "Unknown";

        return (
          <tr key={flight.id} className="hover:bg-neutral-50">
            <td className={portalTdClassName}>{formatRoute(flight)}</td>
            <td className={portalTdClassName}>{formatAircraft(flight)}</td>
            <td className={portalTdClassName}>{status}</td>
            <td className={portalTdClassName}>
              {formatPortalDate(flight.created_at)}
            </td>
            <td className={portalTdClassName}>
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
    </PortalTable>
  );
}
