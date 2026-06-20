"use client";

import { useState } from "react";

import { CreateFlightSection } from "@/app/app/organisation/[organisationId]/_components/create-flight-section";
import { FlightsList } from "@/app/app/organisation/[organisationId]/_components/flights-list";
import { PortalButton } from "@/components/portal-button";
import { portalCardClassName } from "@/components/portal-styles";
import { SectionHeader } from "@/components/section-header";
import type { FleetAircraftListItem } from "@/lib/fleet";
import type { OrganisationFlightListItem } from "@/lib/flights";
import type { OrganisationMember } from "@/lib/organisation";

type FlightsSectionProps = {
  analysisPageBasePath: string;
  createFlightApiPath: string;
  flights: OrganisationFlightListItem[];
  aircraft: FleetAircraftListItem[];
  members?: OrganisationMember[];
};

/**
 * Flights list with modal-based flight creation.
 */
export function FlightsSection({
  analysisPageBasePath,
  createFlightApiPath,
  flights,
  aircraft,
  members = [],
}: FlightsSectionProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className={portalCardClassName}>
      <SectionHeader
        title="Flights"
        description="Upload flight plans and track analysis status."
        action={
          <PortalButton onClick={() => setCreateOpen(true)}>
            + Add flight
          </PortalButton>
        }
      />

      <FlightsList analysisPageBasePath={analysisPageBasePath} flights={flights} />

      <CreateFlightSection
        createFlightApiPath={createFlightApiPath}
        analysisPageBasePath={analysisPageBasePath}
        aircraft={aircraft}
        members={members}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
