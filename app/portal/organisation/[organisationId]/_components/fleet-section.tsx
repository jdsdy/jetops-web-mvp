"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AircraftReferenceGroup,
  FleetAircraftListItem,
} from "@/lib/fleet";

type FleetSectionProps = {
  organisationId: string;
  isAdmin: boolean;
};

type ApiErrorResponse = {
  error?: string;
};

/**
 * Displays an organisation fleet and lets admins add and manage aircraft.
 */
export function FleetSection({ organisationId, isAdmin }: FleetSectionProps) {
  const manageDialogRef = useRef<HTMLDialogElement>(null);
  const [fleet, setFleet] = useState<FleetAircraftListItem[]>([]);
  const [referenceGroups, setReferenceGroups] = useState<AircraftReferenceGroup[]>(
    [],
  );
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [tailNumber, setTailNumber] = useState("");
  const [seats, setSeats] = useState("");
  const [rnavEquipped, setRnavEquipped] = useState(false);
  const [managedAircraft, setManagedAircraft] =
    useState<FleetAircraftListItem | null>(null);
  const [editTailNumber, setEditTailNumber] = useState("");
  const [editSeats, setEditSeats] = useState("");
  const [editRnavEquipped, setEditRnavEquipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitPending, setSubmitPending] = useState(false);
  const [managePending, setManagePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedReferenceGroup = useMemo(
    () =>
      referenceGroups.find(
        (group) => group.manufacturer === selectedManufacturer,
      ) ?? null,
    [referenceGroups, selectedManufacturer],
  );

  /**
   * Loads fleet aircraft for the organisation.
   *
   * - Fetches `/api/organisations/{organisationId}/fleet`
   * - Surfaces API errors and stops loading on failure
   */
  const loadFleet = useCallback(async () => {
    const response = await fetch(`/api/organisations/${organisationId}/fleet`);
    const result = (await response.json()) as
      | FleetAircraftListItem[]
      | ApiErrorResponse;

    if (!response.ok) {
      setError(
        "error" in result
          ? (result.error ?? "Failed to load fleet")
          : "Failed to load fleet",
      );
      return false;
    }

    setFleet(Array.isArray(result) ? result : []);
    return true;
  }, [organisationId]);

  /**
   * Loads aircraft reference data for admin dropdown menus.
   */
  const loadReferenceData = useCallback(async () => {
    const response = await fetch("/api/aircraft-reference");
    const result = (await response.json()) as
      | AircraftReferenceGroup[]
      | ApiErrorResponse;

    if (!response.ok) {
      setError(
        "error" in result
          ? (result.error ?? "Failed to load aircraft reference data")
          : "Failed to load aircraft reference data",
      );
      return false;
    }

    setReferenceGroups(Array.isArray(result) ? result : []);
    return true;
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError(null);

      const fleetLoaded = await loadFleet();
      const referenceLoaded = isAdmin ? await loadReferenceData() : true;

      if (fleetLoaded && referenceLoaded) {
        setLoading(false);
      } else {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [isAdmin, loadFleet, loadReferenceData]);

  /**
   * Opens the manage dialog for a fleet aircraft.
   */
  function openManageDialog(aircraft: FleetAircraftListItem) {
    setManagedAircraft(aircraft);
    setEditTailNumber(aircraft.tail_number);
    setEditSeats(String(aircraft.seats));
    setEditRnavEquipped(aircraft.rnav_equipped);
    setError(null);
    setMessage(null);
    manageDialogRef.current?.showModal();
  }

  /**
   * Closes the manage dialog and clears edit state.
   */
  function closeManageDialog() {
    setManagedAircraft(null);
    manageDialogRef.current?.close();
  }

  /**
   * Adds an aircraft to the organisation fleet.
   *
   * - Validates the selected manufacturer/model pair locally
   * - POSTs the payload to `/api/organisations/{organisationId}/fleet`
   * - Clears the form and reloads the fleet list on success
   */
  async function handleAddAircraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitPending(true);
    setError(null);
    setMessage(null);

    const aircraftRefId = Number(selectedModelId);
    const seatCount = Number(seats);

    if (!selectedManufacturer || !selectedModelId) {
      setError("Manufacturer and model are required");
      setSubmitPending(false);
      return;
    }

    const response = await fetch(`/api/organisations/${organisationId}/fleet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aircraft_ref_id: aircraftRefId,
        tail_number: tailNumber,
        seats: seatCount,
        rnav_equipped: rnavEquipped,
      }),
    });

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to add aircraft");
      setSubmitPending(false);
      return;
    }

    setSelectedManufacturer("");
    setSelectedModelId("");
    setTailNumber("");
    setSeats("");
    setRnavEquipped(false);
    setMessage("Aircraft added to fleet.");
    setSubmitPending(false);
    await loadFleet();
  }

  /**
   * Updates a fleet aircraft via PATCH.
   *
   * - Sends tail number, seats, and RNAV flag to the aircraft route
   * - Closes the dialog and reloads the fleet list on success
   */
  async function handleUpdateAircraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!managedAircraft) {
      return;
    }

    setManagePending(true);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/fleet/${managedAircraft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tail_number: editTailNumber,
          seats: Number(editSeats),
          rnav_equipped: editRnavEquipped,
        }),
      },
    );

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to update aircraft");
      setManagePending(false);
      return;
    }

    setMessage("Aircraft updated.");
    setManagePending(false);
    closeManageDialog();
    await loadFleet();
  }

  /**
   * Deletes a fleet aircraft via DELETE.
   *
   * - Calls the aircraft route for the selected row
   * - Closes the dialog and reloads the fleet list on success
   */
  async function handleDeleteAircraft() {
    if (!managedAircraft) {
      return;
    }

    setDeletePending(true);
    setError(null);
    setMessage(null);

    const response = await fetch(
      `/api/organisations/${organisationId}/fleet/${managedAircraft.id}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const result = (await response.json()) as ApiErrorResponse;
      setError(result.error ?? "Failed to delete aircraft");
      setDeletePending(false);
      return;
    }

    setMessage("Aircraft deleted.");
    setDeletePending(false);
    closeManageDialog();
    await loadFleet();
  }

  if (loading) {
    return <p>Loading fleet...</p>;
  }

  return (
    <section>
      <h2>Fleet</h2>

      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}

      {fleet.length === 0 ? (
        <p>No aircraft in the fleet yet.</p>
      ) : (
        <ul>
          {fleet.map((aircraft) => (
            <li key={aircraft.id}>
              <span>{aircraft.manufacturer}</span>
              <span> — </span>
              <span>{aircraft.model}</span>
              <span> — </span>
              <span>{aircraft.tail_number}</span>
              {isAdmin ? (
                <>
                  <span> </span>
                  <button type="button" onClick={() => openManageDialog(aircraft)}>
                    Manage
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isAdmin ? (
        <>
          <dialog
            ref={manageDialogRef}
            onClose={() => setManagedAircraft(null)}
          >
            <form onSubmit={handleUpdateAircraft}>
              <h3>Manage aircraft</h3>

              {managedAircraft ? (
                <p>
                  {managedAircraft.manufacturer} — {managedAircraft.model}
                </p>
              ) : null}

              <div>
                <label htmlFor="edit_tail_number">Tail number</label>
                <input
                  id="edit_tail_number"
                  name="edit_tail_number"
                  type="text"
                  value={editTailNumber}
                  onChange={(event) => setEditTailNumber(event.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_seats">Seats</label>
                <input
                  id="edit_seats"
                  name="edit_seats"
                  type="number"
                  min={1}
                  max={32767}
                  value={editSeats}
                  onChange={(event) => setEditSeats(event.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_rnav_equipped">
                  <input
                    id="edit_rnav_equipped"
                    name="edit_rnav_equipped"
                    type="checkbox"
                    checked={editRnavEquipped}
                    onChange={(event) => setEditRnavEquipped(event.target.checked)}
                  />
                  RNAV equipped
                </label>
              </div>

              <div>
                <label htmlFor="edit_custom_data">Custom data</label>
                <input
                  id="edit_custom_data"
                  name="edit_custom_data"
                  type="text"
                  disabled
                  placeholder="Coming soon"
                />
              </div>

              <div>
                <button type="submit" disabled={managePending || deletePending}>
                  Save changes
                </button>
                <button
                  type="button"
                  disabled={managePending || deletePending}
                  onClick={() => void handleDeleteAircraft()}
                >
                  Delete aircraft
                </button>
                <button
                  type="button"
                  disabled={managePending || deletePending}
                  onClick={closeManageDialog}
                >
                  Cancel
                </button>
              </div>
            </form>
          </dialog>

          <section>
            <h3>Add aircraft</h3>

            <form onSubmit={handleAddAircraft}>
              <div>
                <label htmlFor="manufacturer">Manufacturer</label>
                <select
                  id="manufacturer"
                  value={selectedManufacturer}
                  onChange={(event) => {
                    setSelectedManufacturer(event.target.value);
                    setSelectedModelId("");
                  }}
                  required
                >
                  <option value="">Select manufacturer</option>
                  {referenceGroups.map((group) => (
                    <option key={group.manufacturer} value={group.manufacturer}>
                      {group.manufacturer}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="model">Model</label>
                <select
                  id="model"
                  value={selectedModelId}
                  onChange={(event) => setSelectedModelId(event.target.value)}
                  disabled={!selectedReferenceGroup}
                  required
                >
                  <option value="">Select model</option>
                  {selectedReferenceGroup?.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tail_number">Tail number</label>
                <input
                  id="tail_number"
                  name="tail_number"
                  type="text"
                  value={tailNumber}
                  onChange={(event) => setTailNumber(event.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="seats">Seats</label>
                <input
                  id="seats"
                  name="seats"
                  type="number"
                  min={1}
                  max={32767}
                  value={seats}
                  onChange={(event) => setSeats(event.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="rnav_equipped">
                  <input
                    id="rnav_equipped"
                    name="rnav_equipped"
                    type="checkbox"
                    checked={rnavEquipped}
                    onChange={(event) => setRnavEquipped(event.target.checked)}
                  />
                  RNAV equipped
                </label>
              </div>

              <div>
                <label htmlFor="custom_data">Custom data</label>
                <input
                  id="custom_data"
                  name="custom_data"
                  type="text"
                  disabled
                  placeholder="Coming soon"
                />
              </div>

              <button type="submit" disabled={submitPending}>
                Add aircraft
              </button>
            </form>
          </section>
        </>
      ) : null}
    </section>
  );
}
