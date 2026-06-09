import Link from "next/link";

import type { OrganisationFlightListItem } from "@/lib/flights";

type FlightsListProps = {
  organisationId: string;
  flights: OrganisationFlightListItem[];
};

/**
 * Formats a flight row label for the organisation flights list.
 */
function formatFlightLabel(flight: OrganisationFlightListItem): string {
  if (flight.departure_icao && flight.arrival_icao) {
    return `${flight.departure_icao} → ${flight.arrival_icao}`;
  }

  if (flight.tail_number && flight.model) {
    return `${flight.tail_number} — ${flight.model}`;
  }

  if (flight.tail_number) {
    return flight.tail_number;
  }

  return `Flight ${flight.id.slice(0, 8)}`;
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
 * Displays organisation flights with links to the flight status page.
 */
export function FlightsList({ organisationId, flights }: FlightsListProps) {
  return (
    <section>
      <h2>Flights</h2>

      {flights.length === 0 ? (
        <p>No flights yet.</p>
      ) : (
        <ul>
          {flights.map((flight) => {
            const label = formatFlightLabel(flight);
            const status = flight.job_status ?? flight.status ?? "Unknown";
            const href = buildFlightPageHref(organisationId, flight);
            const rowText = `${label} — ${status}`;

            return (
              <li key={flight.id}>
                {href ? <Link href={href}>{rowText}</Link> : <span>{rowText}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
