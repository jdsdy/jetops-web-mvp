"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/modal";
import { PortalAlerts } from "@/components/portal-alerts";
import { PortalButton } from "@/components/portal-button";
import {
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
} from "@/components/portal-styles";
import type { FleetAircraftListItem } from "@/lib/fleet";
import type { OrganisationMember } from "@/lib/organisation";

type CreateFlightSectionProps = {
  createFlightApiPath: string;
  analysisPageBasePath: string;
  aircraft: FleetAircraftListItem[];
  members?: OrganisationMember[];
  open: boolean;
  onClose: () => void;
};

type ApiErrorResponse = {
  error?: string;
};

type CreateFlightResponse = {
  flight_id: string;
  job_id: string;
};

/**
 * Returns whether a JSON body is a successful flight create response.
 */
function isCreateFlightResponse(body: unknown): body is CreateFlightResponse {
  if (!body || typeof body !== "object") {
    return false;
  }

  return "flight_id" in body && "job_id" in body;
}

/**
 * Lets organisation members create a flight with a PDF flight plan upload.
 */
export function CreateFlightSection({
  createFlightApiPath,
  analysisPageBasePath,
  aircraft,
  members = [],
  open,
  onClose,
}: CreateFlightSectionProps) {
  const router = useRouter();
  const [aircraftId, setAircraftId] = useState("");
  const [picUserId, setPicUserId] = useState("");
  const [flightPlanFile, setFlightPlanFile] = useState<File | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitPending) {
      return;
    }

    setError(null);
    onClose();
  }

  /**
   * Creates a flight and redirects to the flights status page.
   */
  async function handleCreateFlight(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitPending(true);
    setError(null);

    if (!flightPlanFile) {
      setError("Flight plan PDF is required");
      setSubmitPending(false);
      return;
    }

    const formData = new FormData();
    formData.set("aircraft_id", aircraftId);
    if (members.length > 0) {
      formData.set("pic_user_id", picUserId);
    }
    formData.set("flight_plan", flightPlanFile);

    const response = await fetch(createFlightApiPath, {
      method: "POST",
      body: formData,
    });
    const result: unknown = await response.json();

    if (!response.ok) {
      const errorResult = result as ApiErrorResponse;
      setError(errorResult.error ?? "Failed to create flight");
      setSubmitPending(false);
      return;
    }

    if (!isCreateFlightResponse(result)) {
      setError("Failed to create flight");
      setSubmitPending(false);
      return;
    }

    router.push(
      `${analysisPageBasePath}?id=${result.flight_id}&jobId=${result.job_id}`,
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add flight"
      footer={
        <>
          <PortalButton variant="secondary" disabled={submitPending} onClick={handleClose}>
            Cancel
          </PortalButton>
          <PortalButton
            type="submit"
            form="create-flight-form"
            disabled={submitPending}
          >
            {submitPending ? "Creating..." : "Create flight"}
          </PortalButton>
        </>
      }
    >
      <PortalAlerts error={error} />

      <form id="create-flight-form" onSubmit={handleCreateFlight} className="space-y-4">
        <div className={portalFieldGroupClassName}>
          <label htmlFor="aircraft_id" className={portalLabelClassName}>
            Aircraft
          </label>
          <select
            id="aircraft_id"
            value={aircraftId}
            onChange={(event) => setAircraftId(event.target.value)}
            required
            className={portalFieldClassName}
          >
            <option value="">Select aircraft</option>
            {aircraft.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tail_number} — {item.model}
              </option>
            ))}
          </select>
        </div>

        {members.length > 0 ? (
          <div className={portalFieldGroupClassName}>
            <label htmlFor="pic_user_id" className={portalLabelClassName}>
              PIC
            </label>
            <select
              id="pic_user_id"
              value={picUserId}
              onChange={(event) => setPicUserId(event.target.value)}
              required
              className={portalFieldClassName}
            >
              <option value="">Select PIC</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.display_name ?? "Unknown"} — {member.role}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className={portalFieldGroupClassName}>
          <label htmlFor="flight_plan" className={portalLabelClassName}>
            Flight plan PDF
          </label>
          <input
            id="flight_plan"
            name="flight_plan"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) =>
              setFlightPlanFile(event.target.files?.[0] ?? null)
            }
            required
            className={portalFieldClassName}
          />
        </div>
      </form>
    </Modal>
  );
}
