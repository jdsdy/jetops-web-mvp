"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
import { PortalAlerts } from "@/components/portal-alerts";
import { PortalButton } from "@/components/portal-button";
import {
  portalCardClassName,
  portalFieldClassName,
  portalFieldGroupClassName,
  portalLabelClassName,
  portalLinkClassName,
  portalTdClassName,
} from "@/components/portal-styles";
import { PortalTable } from "@/components/portal-table";
import { SectionHeader } from "@/components/section-header";
import { TableSkeleton } from "@/components/table-skeleton";
import type {
  AircraftReferenceGroup,
  FleetAircraftListItem,
} from "@/lib/fleet";
import {
  CustomAircraftFields,
  EMPTY_CUSTOM_AIRCRAFT_FORM,
  type CustomAircraftFormValues,
} from "@/app/app/organisation/[organisationId]/_components/custom-aircraft-fields";

type FleetSectionProps = {
  organisationId: string;
  isAdmin: boolean;
  initialFleet?: FleetAircraftListItem[];
};

type ApiErrorResponse = {
  error?: string;
};

/**
 * Displays an organisation fleet and lets admins add and manage aircraft.
 */
export function FleetSection({
  organisationId,
  isAdmin,
  initialFleet,
}: FleetSectionProps) {
  const [fleet, setFleet] = useState<FleetAircraftListItem[]>(initialFleet ?? []);
  const [referenceGroups, setReferenceGroups] = useState<AircraftReferenceGroup[]>(
    [],
  );
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [tailNumber, setTailNumber] = useState("");
  const [seats, setSeats] = useState("");
  const [rnavEquipped, setRnavEquipped] = useState(false);
  const [useCustomAircraft, setUseCustomAircraft] = useState(false);
  const [customAircraftForm, setCustomAircraftForm] =
    useState<CustomAircraftFormValues>(EMPTY_CUSTOM_AIRCRAFT_FORM);
  const [managedAircraft, setManagedAircraft] =
    useState<FleetAircraftListItem | null>(null);
  const [editTailNumber, setEditTailNumber] = useState("");
  const [editSeats, setEditSeats] = useState("");
  const [editRnavEquipped, setEditRnavEquipped] = useState(false);
  const [loading, setLoading] = useState(initialFleet === undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
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
      if (initialFleet === undefined) {
        setLoading(true);
      }

      setError(null);

      await loadFleet();
      if (isAdmin) {
        await loadReferenceData();
      }

      setLoading(false);
    }

    void loadInitialData();
  }, [initialFleet, isAdmin, loadFleet, loadReferenceData]);

  function openManageDialog(aircraft: FleetAircraftListItem) {
    setManagedAircraft(aircraft);
    setEditTailNumber(aircraft.tail_number);
    setEditSeats(String(aircraft.seats));
    setEditRnavEquipped(aircraft.rnav_equipped);
    setError(null);
    setMessage(null);
    setManageOpen(true);
  }

  function closeManageDialog() {
    setManagedAircraft(null);
    setManageOpen(false);
  }

  function resetAddForm() {
    setSelectedManufacturer("");
    setSelectedModelId("");
    setTailNumber("");
    setSeats("");
    setRnavEquipped(false);
    setUseCustomAircraft(false);
    setCustomAircraftForm(EMPTY_CUSTOM_AIRCRAFT_FORM);
  }

  function closeAddDialog() {
    if (submitPending) {
      return;
    }

    setAddOpen(false);
    setError(null);
    resetAddForm();
  }

  async function handleAddAircraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitPending(true);
    setError(null);
    setMessage(null);

    const requestBody = useCustomAircraft
      ? {
          manufacturer: customAircraftForm.manufacturer,
          model: customAircraftForm.model,
          tail_number: customAircraftForm.tailNumber,
          seats: Number(customAircraftForm.seats),
          rnav_equipped: customAircraftForm.rnavEquipped,
          icao_wtc: customAircraftForm.icaoWtc,
          weight_class: customAircraftForm.weightClass,
          wingspan_ft: Number(customAircraftForm.wingspanFt),
          length_ft: Number(customAircraftForm.lengthFt),
          aac: customAircraftForm.aac,
          adg: customAircraftForm.adg,
        }
      : {
          aircraft_ref_id: Number(selectedModelId),
          tail_number: tailNumber,
          seats: Number(seats),
          rnav_equipped: rnavEquipped,
        };

    if (useCustomAircraft) {
      if (
        !customAircraftForm.manufacturer.trim() ||
        !customAircraftForm.model.trim()
      ) {
        setError("Manufacturer and model are required");
        setSubmitPending(false);
        return;
      }
    } else if (!selectedManufacturer || !selectedModelId) {
      setError("Manufacturer and model are required");
      setSubmitPending(false);
      return;
    }

    const response = await fetch(`/api/organisations/${organisationId}/fleet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setError(result.error ?? "Failed to add aircraft");
      setSubmitPending(false);
      return;
    }

    resetAddForm();
    setMessage("Aircraft added to fleet.");
    setSubmitPending(false);
    setAddOpen(false);
    await loadFleet();
  }

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

  return (
    <div className={portalCardClassName}>
      <SectionHeader
        title="Fleet"
        description="Organisation aircraft available for flight planning."
        action={
          isAdmin ? (
            <PortalButton onClick={() => setAddOpen(true)}>
              + Add aircraft
            </PortalButton>
          ) : undefined
        }
      />

      <PortalAlerts error={error} message={message} />

      {loading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : fleet.length === 0 ? (
        <p className="text-sm text-aviation-slate">
          No aircraft in the fleet yet.
        </p>
      ) : (
        <PortalTable
          columns={
            isAdmin
              ? ["Manufacturer", "Model", "Tail number", "Seats", "RNAV", "Actions"]
              : ["Manufacturer", "Model", "Tail number", "Seats", "RNAV"]
          }
        >
          {fleet.map((aircraft) => (
            <tr key={aircraft.id} className="hover:bg-neutral-50">
              <td className={portalTdClassName}>{aircraft.manufacturer}</td>
              <td className={portalTdClassName}>{aircraft.model}</td>
              <td className={portalTdClassName}>{aircraft.tail_number}</td>
              <td className={portalTdClassName}>{aircraft.seats}</td>
              <td className={portalTdClassName}>
                {aircraft.rnav_equipped ? "Yes" : "No"}
              </td>
              {isAdmin ? (
                <td className={portalTdClassName}>
                  <button
                    type="button"
                    onClick={() => openManageDialog(aircraft)}
                    className={portalLinkClassName}
                  >
                    Manage
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </PortalTable>
      )}

      {isAdmin ? (
        <>
          <Modal
            open={manageOpen}
            onClose={closeManageDialog}
            title="Manage aircraft"
            footer={
              <>
                <PortalButton
                  variant="secondary"
                  disabled={managePending || deletePending}
                  onClick={closeManageDialog}
                >
                  Cancel
                </PortalButton>
                <PortalButton
                  variant="secondary"
                  disabled={managePending || deletePending}
                  onClick={() => void handleDeleteAircraft()}
                >
                  {deletePending ? "Deleting..." : "Delete"}
                </PortalButton>
                <PortalButton
                  type="submit"
                  form="manage-aircraft-form"
                  disabled={managePending || deletePending}
                >
                  {managePending ? "Saving..." : "Save changes"}
                </PortalButton>
              </>
            }
          >
            {managedAircraft ? (
              <p className="mb-4 text-sm text-aviation-slate">
                {managedAircraft.manufacturer} — {managedAircraft.model}
              </p>
            ) : null}

            <form
              id="manage-aircraft-form"
              onSubmit={handleUpdateAircraft}
              className="space-y-4"
            >
              <div className={portalFieldGroupClassName}>
                <label htmlFor="edit_tail_number" className={portalLabelClassName}>
                  Tail number
                </label>
                <input
                  id="edit_tail_number"
                  name="edit_tail_number"
                  type="text"
                  value={editTailNumber}
                  onChange={(event) => setEditTailNumber(event.target.value)}
                  required
                  className={portalFieldClassName}
                />
              </div>

              <div className={portalFieldGroupClassName}>
                <label htmlFor="edit_seats" className={portalLabelClassName}>
                  Seats
                </label>
                <input
                  id="edit_seats"
                  name="edit_seats"
                  type="number"
                  min={1}
                  max={32767}
                  value={editSeats}
                  onChange={(event) => setEditSeats(event.target.value)}
                  required
                  className={portalFieldClassName}
                />
              </div>

              <div className={portalFieldGroupClassName}>
                <label htmlFor="edit_rnav_equipped" className={portalLabelClassName}>
                  <input
                    id="edit_rnav_equipped"
                    name="edit_rnav_equipped"
                    type="checkbox"
                    checked={editRnavEquipped}
                    onChange={(event) => setEditRnavEquipped(event.target.checked)}
                    className="mr-2"
                  />
                  RNAV equipped
                </label>
              </div>
            </form>
          </Modal>

          <Modal
            open={addOpen}
            onClose={closeAddDialog}
            title="Add aircraft"
            footer={
              <>
                <PortalButton
                  variant="secondary"
                  disabled={submitPending}
                  onClick={closeAddDialog}
                >
                  Cancel
                </PortalButton>
                <PortalButton
                  type="submit"
                  form="add-aircraft-form"
                  disabled={submitPending}
                >
                  {submitPending ? "Adding..." : "Add aircraft"}
                </PortalButton>
              </>
            }
          >
            <form
              id="add-aircraft-form"
              onSubmit={handleAddAircraft}
              className="space-y-4"
            >
              {useCustomAircraft ? (
                <CustomAircraftFields
                  values={customAircraftForm}
                  onChange={setCustomAircraftForm}
                  onChooseFromList={() => {
                    setUseCustomAircraft(false);
                    setCustomAircraftForm(EMPTY_CUSTOM_AIRCRAFT_FORM);
                  }}
                />
              ) : (
                <>
                  <div className={portalFieldGroupClassName}>
                    <label htmlFor="manufacturer" className={portalLabelClassName}>
                      Manufacturer
                    </label>
                    <select
                      id="manufacturer"
                      value={selectedManufacturer}
                      onChange={(event) => {
                        setSelectedManufacturer(event.target.value);
                        setSelectedModelId("");
                      }}
                      required
                      className={portalFieldClassName}
                    >
                      <option value="">Select manufacturer</option>
                      {referenceGroups.map((group) => (
                        <option key={group.manufacturer} value={group.manufacturer}>
                          {group.manufacturer}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={portalFieldGroupClassName}>
                    <label htmlFor="model" className={portalLabelClassName}>
                      Model
                    </label>
                    <select
                      id="model"
                      value={selectedModelId}
                      onChange={(event) => setSelectedModelId(event.target.value)}
                      disabled={!selectedReferenceGroup}
                      required
                      className={portalFieldClassName}
                    >
                      <option value="">Select model</option>
                      {selectedReferenceGroup?.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={portalFieldGroupClassName}>
                    <label htmlFor="tail_number" className={portalLabelClassName}>
                      Tail number
                    </label>
                    <input
                      id="tail_number"
                      name="tail_number"
                      type="text"
                      value={tailNumber}
                      onChange={(event) => setTailNumber(event.target.value)}
                      required
                      className={portalFieldClassName}
                    />
                  </div>

                  <div className={portalFieldGroupClassName}>
                    <label htmlFor="seats" className={portalLabelClassName}>
                      Seats
                    </label>
                    <input
                      id="seats"
                      name="seats"
                      type="number"
                      min={1}
                      max={32767}
                      value={seats}
                      onChange={(event) => setSeats(event.target.value)}
                      required
                      className={portalFieldClassName}
                    />
                  </div>

                  <div className={portalFieldGroupClassName}>
                    <label htmlFor="rnav_equipped" className={portalLabelClassName}>
                      <input
                        id="rnav_equipped"
                        name="rnav_equipped"
                        type="checkbox"
                        checked={rnavEquipped}
                        onChange={(event) => setRnavEquipped(event.target.checked)}
                        className="mr-2"
                      />
                      RNAV equipped
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUseCustomAircraft(true)}
                    className={portalLinkClassName}
                  >
                    My aircraft isn&apos;t listed
                  </button>
                </>
              )}
            </form>
          </Modal>
        </>
      ) : null}
    </div>
  );
}
