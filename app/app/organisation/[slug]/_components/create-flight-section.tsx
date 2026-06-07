"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FleetAircraftListItem } from "@/lib/fleet";
import type { OrganisationMember } from "@/lib/organisation";

type CreateFlightSectionProps = {
  slug: string;
  aircraft: FleetAircraftListItem[];
  members: OrganisationMember[];
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
  slug,
  aircraft,
  members,
}: CreateFlightSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [aircraftId, setAircraftId] = useState("");
  const [picUserId, setPicUserId] = useState("");
  const [flightPlanFile, setFlightPlanFile] = useState<File | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Creates a flight and redirects to the flights status page.
   *
   * - Builds multipart form data with aircraft, PIC, and PDF file
   * - POSTs to `/api/organisations/{slug}/flights`
   * - Navigates to the flights page with flight and job ids on success
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
    formData.set("pic_user_id", picUserId);
    formData.set("flight_plan", flightPlanFile);

    const response = await fetch(`/api/organisations/${slug}/flights`, {
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
      `/app/organisation/${slug}/flights?id=${result.flight_id}&jobId=${result.job_id}`,
    );
  }

  return (
    <section>
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)}>
          Create flight
        </button>
      ) : (
        <>
          <h2>Create flight</h2>

          {error ? <p role="alert">{error}</p> : null}

          <form onSubmit={handleCreateFlight}>
            <div>
              <label htmlFor="aircraft_id">Aircraft</label>
              <select
                id="aircraft_id"
                value={aircraftId}
                onChange={(event) => setAircraftId(event.target.value)}
                required
              >
                <option value="">Select aircraft</option>
                {aircraft.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tail_number} — {item.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pic_user_id">PIC</label>
              <select
                id="pic_user_id"
                value={picUserId}
                onChange={(event) => setPicUserId(event.target.value)}
                required
              >
                <option value="">Select PIC</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.display_name ?? "Unknown"} — {member.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="flight_plan">Flight plan PDF</label>
              <input
                id="flight_plan"
                name="flight_plan"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                  setFlightPlanFile(event.target.files?.[0] ?? null)
                }
                required
              />
            </div>

            <div>
              <button type="submit" disabled={submitPending}>
                Create flight
              </button>
              <button
                type="button"
                disabled={submitPending}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
