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

type UploadBriefingModalProps = {
  open: boolean;
  onClose: () => void;
  reuploadApiPath: string;
  flightId: string;
  analysisPageBasePath: string;
};

type ApiErrorResponse = {
  error?: string;
};

type ReuploadFlightPlanResponse = {
  flight_id: string;
  job_id: string;
};

/**
 * Returns whether a JSON body is a successful reupload response.
 */
function isReuploadFlightPlanResponse(
  body: unknown,
): body is ReuploadFlightPlanResponse {
  if (!body || typeof body !== "object") {
    return false;
  }

  return "flight_id" in body && "job_id" in body;
}

/**
 * Lets users replace the current flight plan PDF on an existing flight.
 */
export function UploadBriefingModal({
  open,
  onClose,
  reuploadApiPath,
  flightId,
  analysisPageBasePath,
}: UploadBriefingModalProps) {
  const router = useRouter();
  const [flightPlanFile, setFlightPlanFile] = useState<File | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitPending) {
      return;
    }

    setError(null);
    setFlightPlanFile(null);
    onClose();
  }

  /**
   * Uploads a replacement briefing and reloads the analysis page for the new job.
   */
  async function handleReupload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitPending(true);
    setError(null);

    if (!flightPlanFile) {
      setError("Flight plan PDF is required");
      setSubmitPending(false);
      return;
    }

    const formData = new FormData();
    formData.set("flight_plan", flightPlanFile);

    const response = await fetch(reuploadApiPath, {
      method: "POST",
      body: formData,
    });
    const result: unknown = await response.json();

    if (!response.ok) {
      const errorResult = result as ApiErrorResponse;
      setError(errorResult.error ?? "Failed to upload briefing");
      setSubmitPending(false);
      return;
    }

    if (!isReuploadFlightPlanResponse(result)) {
      setError("Failed to upload briefing");
      setSubmitPending(false);
      return;
    }

    router.replace(
      `${analysisPageBasePath}?id=${encodeURIComponent(result.flight_id)}&jobId=${encodeURIComponent(result.job_id)}`,
    );
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Upload new briefing"
      footer={
        <>
          <PortalButton variant="secondary" disabled={submitPending} onClick={handleClose}>
            Cancel
          </PortalButton>
          <PortalButton
            type="submit"
            form="upload-briefing-form"
            disabled={submitPending}
          >
            {submitPending ? "Uploading..." : "Upload briefing"}
          </PortalButton>
        </>
      }
    >
      <PortalAlerts error={error} />

      <form id="upload-briefing-form" onSubmit={handleReupload} className="space-y-4">
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
