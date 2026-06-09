import { describe, expect, it } from "vitest";

import {
  buildFlightPlanStoragePath,
  formatNotamText,
  formatFlightExtractionDateTimeForDisplay,
  formatFlightExtractionDateTimeForInput,
  hasFlightExtractionChanges,
  isExtractionReadyJobStatus,
  isFlightExtractionEditableJobStatus,
  mapFlightExtractionDetails,
  mapRawNotamRow,
  parseFlightExtractionDateTimeInput,
  sanitizeFlightPlanFilename,
  splitFlightExtractionUpdate,
  validateCreateFlightFormData,
  validateFlightExtractionUpdatePayload,
} from "@/lib/flights";

describe("buildFlightPlanStoragePath", () => {
  it("builds a storage path from org, flight, plan, and filename", () => {
    expect(
      buildFlightPlanStoragePath(
        "org-1",
        "flight-2",
        "plan-3",
        "briefing.pdf",
      ),
    ).toBe("org-1/flight-2/plan-3/briefing.pdf");
  });
});

describe("sanitizeFlightPlanFilename", () => {
  it("returns briefing.pdf for empty input", () => {
    expect(sanitizeFlightPlanFilename("")).toBe("briefing.pdf");
  });

  it("strips path segments and enforces pdf extension", () => {
    expect(sanitizeFlightPlanFilename("../../evil/plan.PDF")).toBe("plan.pdf");
  });

  it("preserves a safe filename", () => {
    expect(sanitizeFlightPlanFilename("my-briefing.pdf")).toBe("my-briefing.pdf");
  });
});

describe("isExtractionReadyJobStatus", () => {
  it("returns true once extraction has finished", () => {
    expect(isExtractionReadyJobStatus("awaiting_confirmation")).toBe(true);
    expect(isExtractionReadyJobStatus("processing_analysis")).toBe(true);
    expect(isExtractionReadyJobStatus("complete")).toBe(true);
  });

  it("returns false while extraction is still running", () => {
    expect(isExtractionReadyJobStatus("processing_extraction")).toBe(false);
  });
});

describe("formatNotamText", () => {
  it("returns null for empty values", () => {
    expect(formatNotamText(null)).toBeNull();
  });

  it("replaces NOTAM newline placeholders with line breaks", () => {
    expect(
      formatNotamText("HANDLING SERVICES AMD {\\n} REMOVE THE FLW: {\\n} JET AVIATION"),
    ).toBe("HANDLING SERVICES AMD \n REMOVE THE FLW: \n JET AVIATION");
  });
});

describe("mapRawNotamRow", () => {
  it("formats all NOTAM text fields", () => {
    expect(
      mapRawNotamRow({
        id: 1,
        notam_id: "A1234/26",
        title: "SYD {\\n} FBO",
        q: "Q) YBBB/QMXLC/IV/NBO/A/000/999/3357S15111E005",
        a: "YSSY",
        b: "2026-06-05",
        c: "2026-06-12",
        d: "0600-1800",
        e: "SERVICES AMD {\\n} LOUNGE CLOSED",
        f: "SFC",
        g: "FL100",
      }),
    ).toEqual({
      id: 1,
      notam_id: "A1234/26",
      title: "SYD \n FBO",
      q: "Q) YBBB/QMXLC/IV/NBO/A/000/999/3357S15111E005",
      a: "YSSY",
      b: "2026-06-05",
      c: "2026-06-12",
      d: "0600-1800",
      e: "SERVICES AMD \n LOUNGE CLOSED",
      f: "SFC",
      g: "FL100",
    });
  });
});

describe("formatFlightExtractionDateTimeForInput", () => {
  it("formats stored timestamps using UTC components", () => {
    expect(formatFlightExtractionDateTimeForInput("2026-06-05T10:00:00.000Z")).toBe(
      "2026-06-05T10:00",
    );
  });
});

describe("formatFlightExtractionDateTimeForDisplay", () => {
  it("formats stored timestamps for UTC read-only display", () => {
    expect(formatFlightExtractionDateTimeForDisplay("2026-06-05T10:00:00.000Z")).toBe(
      "2026-06-05 10:00 UTC",
    );
  });
});

describe("parseFlightExtractionDateTimeInput", () => {
  it("parses datetime-local values as UTC", () => {
    expect(parseFlightExtractionDateTimeInput("2026-06-05T10:00")).toBe(
      "2026-06-05T10:00:00.000Z",
    );
  });
});

describe("isFlightExtractionEditableJobStatus", () => {
  it("returns true only while awaiting confirmation", () => {
    expect(isFlightExtractionEditableJobStatus("awaiting_confirmation")).toBe(true);
    expect(isFlightExtractionEditableJobStatus("processing_analysis")).toBe(false);
  });
});

describe("hasFlightExtractionChanges", () => {
  const saved = {
    departure_icao: "EGLL",
    arrival_icao: "LFPG",
    source_app: "ForeFlight",
    route: "LAM SOU",
    cruise_level: "FL380",
    dept_rwy: "09L",
    arr_rwy: "26R",
    planned_dept_time: "2026-06-05T10:00:00.000Z",
    planned_arr_time: "2026-06-05T12:30:00.000Z",
    alt_icao: "EGKK",
  };

  it("returns false when draft matches saved values", () => {
    expect(hasFlightExtractionChanges(saved, saved)).toBe(false);
  });

  it("returns true when a field changes", () => {
    expect(
      hasFlightExtractionChanges(saved, {
        ...saved,
        route: "LAM SOU BPK",
      }),
    ).toBe(true);
  });
});

describe("validateFlightExtractionUpdatePayload", () => {
  const validBody = {
    job_id: "33333333-3333-4333-8333-333333333333",
    departure_icao: "EGLL",
    arrival_icao: "LFPG",
    source_app: "ForeFlight",
    route: "LAM SOU",
    cruise_level: "FL380",
    dept_rwy: "09L",
    arr_rwy: "26R",
    planned_dept_time: "2026-06-05T10:00:00.000Z",
    planned_arr_time: "2026-06-05T12:30:00.000Z",
    alt_icao: "EGKK",
  };

  it("accepts a complete payload", () => {
    expect(validateFlightExtractionUpdatePayload(validBody)).toEqual({
      valid: true,
      jobId: validBody.job_id,
      details: {
        departure_icao: "EGLL",
        arrival_icao: "LFPG",
        source_app: "ForeFlight",
        route: "LAM SOU",
        cruise_level: "FL380",
        dept_rwy: "09L",
        arr_rwy: "26R",
        planned_dept_time: "2026-06-05T10:00:00.000Z",
        planned_arr_time: "2026-06-05T12:30:00.000Z",
        alt_icao: "EGKK",
      },
    });
  });

  it("rejects an invalid job id", () => {
    expect(
      validateFlightExtractionUpdatePayload({
        ...validBody,
        job_id: "not-a-uuid",
      }),
    ).toEqual({
      valid: false,
      error: "Job id is invalid",
    });
  });

  it("rejects an invalid planned departure time", () => {
    expect(
      validateFlightExtractionUpdatePayload({
        ...validBody,
        planned_dept_time: "not-a-date",
      }),
    ).toEqual({
      valid: false,
      error: "Planned departure time is invalid",
    });
  });
});

describe("splitFlightExtractionUpdate", () => {
  it("splits flight and flight plan fields", () => {
    expect(
      splitFlightExtractionUpdate({
        departure_icao: "EGLL",
        arrival_icao: "LFPG",
        source_app: "ForeFlight",
        route: "LAM SOU",
        cruise_level: "FL380",
        dept_rwy: "09L",
        arr_rwy: "26R",
        planned_dept_time: "2026-06-05T10:00:00.000Z",
        planned_arr_time: "2026-06-05T12:30:00.000Z",
        alt_icao: "EGKK",
      }),
    ).toEqual({
      flight: {
        departure_icao: "EGLL",
        arrival_icao: "LFPG",
      },
      flightPlan: {
        source_app: "ForeFlight",
        route: "LAM SOU",
        cruise_level: "FL380",
        dept_rwy: "09L",
        arr_rwy: "26R",
        planned_dept_time: "2026-06-05T10:00:00.000Z",
        planned_arr_time: "2026-06-05T12:30:00.000Z",
        alt_icao: "EGKK",
      },
    });
  });
});

describe("mapFlightExtractionDetails", () => {
  it("maps flight and current plan extraction fields", () => {
    expect(
      mapFlightExtractionDetails({
        id: "flight-1",
        departure_icao: "EGLL",
        arrival_icao: "LFPG",
        flight_plans: [
          {
            id: "plan-1",
            source_app: "ForeFlight",
            route: "LAM SOU",
            cruise_level: "FL380",
            dept_rwy: "09L",
            arr_rwy: "26R",
            planned_dept_time: "2026-06-05T10:00:00.000Z",
            planned_arr_time: "2026-06-05T12:30:00.000Z",
            alt_icao: "EGKK",
            is_current: true,
          },
        ],
      }),
    ).toEqual({
      departure_icao: "EGLL",
      arrival_icao: "LFPG",
      source_app: "ForeFlight",
      route: "LAM SOU",
      cruise_level: "FL380",
      dept_rwy: "09L",
      arr_rwy: "26R",
      planned_dept_time: "2026-06-05T10:00:00.000Z",
      planned_arr_time: "2026-06-05T12:30:00.000Z",
      alt_icao: "EGKK",
    });
  });
});

describe("validateCreateFlightFormData", () => {
  const validPayload = {
    aircraft_id: "11111111-1111-4111-8111-111111111111",
    pic_user_id: "22222222-2222-4222-8222-222222222222",
    flight_plan: new File(["pdf"], "plan.pdf", { type: "application/pdf" }),
  };

  it("accepts valid form data", () => {
    const formData = new FormData();
    formData.set("aircraft_id", validPayload.aircraft_id);
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set("flight_plan", validPayload.flight_plan);

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: true,
      payload: {
        aircraft_id: validPayload.aircraft_id,
        pic_user_id: validPayload.pic_user_id,
        flight_plan: validPayload.flight_plan,
      },
    });
  });

  it("rejects a missing aircraft id", () => {
    const formData = new FormData();
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set("flight_plan", validPayload.flight_plan);

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: false,
      error: "Aircraft is required",
    });
  });

  it("rejects a non-pdf file", () => {
    const formData = new FormData();
    formData.set("aircraft_id", validPayload.aircraft_id);
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set(
      "flight_plan",
      new File(["txt"], "notes.txt", { type: "text/plain" }),
    );

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: false,
      error: "Flight plan must be a PDF file",
    });
  });

  it("rejects an oversized pdf", () => {
    const formData = new FormData();
    formData.set("aircraft_id", validPayload.aircraft_id);
    formData.set("pic_user_id", validPayload.pic_user_id);
    formData.set(
      "flight_plan",
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "plan.pdf", {
        type: "application/pdf",
      }),
    );

    expect(validateCreateFlightFormData(formData)).toEqual({
      valid: false,
      error: "Flight plan must be 10MB or smaller",
    });
  });
});
