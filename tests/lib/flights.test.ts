import { describe, expect, it } from "vitest";

import {
  buildFlightPlanStoragePath,
  buildFlightAnalysisRequestBody,
  formatNotamText,
  buildFlightAnalysedNotamsSnapshot,
  groupAnalysedNotamsByCategory,
  formatFlightExtractionDateTimeForDisplay,
  formatFlightExtractionDateTimeForInput,
  hasFlightExtractionChanges,
  isAnalysisFailedJobStatus,
  isAnalysisFinishedJobStatus,
  isAnalysisInProgressJobStatus,
  isAnalysisJobPollingStatus,
  isAnalysisPartialFinishJobStatus,
  isAnalysisResultsReadyJobStatus,
  isAnalysisRetryingJobStatus,
  isAnalysedNotamClassified,
  isAnalysedNotamFailed,
  isExtractionReadyJobStatus,
  isFlightAnalysisBegunResponse,
  isFlightExtractionEditableJobStatus,
  mapAnalysedNotamRow,
  mapFlightExtractionDetails,
  mapRawNotamRow,
  parseFlightExtractionDateTimeInput,
  sanitizeFlightPlanFilename,
  splitFlightExtractionUpdate,
  validateCreateFlightFormData,
  validateFlightAnalysisRequestPayload,
  validateFlightExtractionUpdatePayload,
  type RawNotam,
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
    expect(isExtractionReadyJobStatus("finished")).toBe(true);
  });

  it("returns false while extraction is still running", () => {
    expect(isExtractionReadyJobStatus("processing_extraction")).toBe(false);
  });
});

describe("isFlightAnalysisBegunResponse", () => {
  it("returns true for a begun analysis response", () => {
    expect(isFlightAnalysisBegunResponse({ response_begun: true })).toBe(true);
  });

  it("returns false for other payloads", () => {
    expect(isFlightAnalysisBegunResponse({ ok: true })).toBe(false);
  });
});

describe("isAnalysisInProgressJobStatus", () => {
  it("returns true while analysis is running", () => {
    expect(isAnalysisInProgressJobStatus("processing_analysis")).toBe(true);
    expect(isAnalysisInProgressJobStatus("finished")).toBe(false);
  });
});

describe("isAnalysisJobPollingStatus", () => {
  it("returns true only while extraction or analysis is processing", () => {
    expect(isAnalysisJobPollingStatus("processing_extraction")).toBe(true);
    expect(isAnalysisJobPollingStatus("processing_analysis")).toBe(true);
    expect(isAnalysisJobPollingStatus("retrying")).toBe(true);
    expect(isAnalysisJobPollingStatus("awaiting_confirmation")).toBe(false);
    expect(isAnalysisJobPollingStatus("finished")).toBe(false);
    expect(isAnalysisJobPollingStatus("partial_finish")).toBe(false);
    expect(isAnalysisJobPollingStatus("failed")).toBe(false);
  });
});

describe("isAnalysisRetryingJobStatus", () => {
  it("returns true only while analysis is retrying failed points", () => {
    expect(isAnalysisRetryingJobStatus("retrying")).toBe(true);
    expect(isAnalysisRetryingJobStatus("processing_analysis")).toBe(false);
  });
});

describe("isAnalysisPartialFinishJobStatus", () => {
  it("returns true only when analysis ended with unclassified notams", () => {
    expect(isAnalysisPartialFinishJobStatus("partial_finish")).toBe(true);
    expect(isAnalysisPartialFinishJobStatus("finished")).toBe(false);
  });
});

describe("isAnalysisResultsReadyJobStatus", () => {
  it("returns true when analysed results should be shown", () => {
    expect(isAnalysisResultsReadyJobStatus("retrying")).toBe(true);
    expect(isAnalysisResultsReadyJobStatus("partial_finish")).toBe(true);
    expect(isAnalysisResultsReadyJobStatus("finished")).toBe(true);
    expect(isAnalysisResultsReadyJobStatus("processing_analysis")).toBe(false);
  });
});

describe("isAnalysisFailedJobStatus", () => {
  it("returns true only when the analysis job has failed", () => {
    expect(isAnalysisFailedJobStatus("failed")).toBe(true);
    expect(isAnalysisFailedJobStatus("processing_analysis")).toBe(false);
    expect(isAnalysisFailedJobStatus("finished")).toBe(false);
  });
});

describe("isAnalysisFinishedJobStatus", () => {
  it("returns true only when analysis has finished", () => {
    expect(isAnalysisFinishedJobStatus("finished")).toBe(true);
    expect(isAnalysisFinishedJobStatus("processing_analysis")).toBe(false);
  });
});

describe("mapAnalysedNotamRow", () => {
  it("maps analysed notams with joined raw content", () => {
    expect(
      mapAnalysedNotamRow({
        id: 10,
        category: 2,
        summary: "Runway closed overnight",
        did_error: false,
        raw_notams: {
          id: 1,
          notam_id: "A1234/26",
          title: "SYD RWY",
          q: null,
          a: "YSSY",
          b: null,
          c: null,
          d: null,
          e: "RWY 34L CLOSED",
          f: null,
          g: null,
        },
      }),
    ).toEqual({
      id: 10,
      category: 2,
      summary: "Runway closed overnight",
      did_error: false,
      raw_notam: {
        id: 1,
        notam_id: "A1234/26",
        title: "SYD RWY",
        q: null,
        a: "YSSY",
        b: null,
        c: null,
        d: null,
        e: "RWY 34L CLOSED",
        f: null,
        g: null,
      },
    });
  });

  it("maps pending analysed notams without category or summary", () => {
    expect(
      mapAnalysedNotamRow({
        id: 11,
        category: null,
        summary: null,
        did_error: false,
        raw_notams: {
          id: 2,
          notam_id: "B5678/26",
          title: null,
          q: null,
          a: null,
          b: null,
          c: null,
          d: null,
          e: "Taxiway closed",
          f: null,
          g: null,
        },
      }),
    ).toEqual({
      id: 11,
      category: null,
      summary: null,
      did_error: false,
      raw_notam: {
        id: 2,
        notam_id: "B5678/26",
        title: null,
        q: null,
        a: null,
        b: null,
        c: null,
        d: null,
        e: "Taxiway closed",
        f: null,
        g: null,
      },
    });
  });
});

describe("isAnalysedNotamClassified", () => {
  const rawNotam = {
    id: 1,
    notam_id: "A1",
    title: null,
    q: null,
    a: null,
    b: null,
    c: null,
    d: null,
    e: null,
    f: null,
    g: null,
  };

  it("returns true when category and summary are present", () => {
    expect(
      isAnalysedNotamClassified({
        id: 1,
        category: 2,
        summary: "Summary",
        did_error: false,
        raw_notam: rawNotam,
      }),
    ).toBe(true);
  });

  it("returns true when summary is empty but present", () => {
    expect(
      isAnalysedNotamClassified({
        id: 1,
        category: 2,
        summary: "",
        did_error: false,
        raw_notam: rawNotam,
      }),
    ).toBe(true);
  });

  it("returns false when category or summary is missing", () => {
    expect(
      isAnalysedNotamClassified({
        id: 2,
        category: null,
        summary: null,
        did_error: false,
        raw_notam: rawNotam,
      }),
    ).toBe(false);
  });

  it("returns false when analysis failed after retries", () => {
    expect(
      isAnalysedNotamClassified({
        id: 3,
        category: 2,
        summary: "Summary",
        did_error: true,
        raw_notam: rawNotam,
      }),
    ).toBe(false);
  });
});

describe("isAnalysedNotamFailed", () => {
  const rawNotam = {
    id: 1,
    notam_id: "A1",
    title: null,
    q: null,
    a: null,
    b: null,
    c: null,
    d: null,
    e: null,
    f: null,
    g: null,
  };

  it("returns true only when did_error is set", () => {
    expect(
      isAnalysedNotamFailed({
        id: 1,
        category: null,
        summary: null,
        did_error: true,
        raw_notam: rawNotam,
      }),
    ).toBe(true);

    expect(
      isAnalysedNotamFailed({
        id: 2,
        category: null,
        summary: null,
        did_error: false,
        raw_notam: rawNotam,
      }),
    ).toBe(false);
  });
});

describe("buildFlightAnalysedNotamsSnapshot", () => {
  const rawNotam = (id: number, notamId: string): RawNotam => ({
    id,
    notam_id: notamId,
    title: null,
    q: null,
    a: null,
    b: null,
    c: null,
    d: null,
    e: `Body ${id}`,
    f: null,
    g: null,
  });

  it("counts pending notams while retrying", () => {
    const snapshot = buildFlightAnalysedNotamsSnapshot(
      [
        {
          id: 1,
          category: 1,
          summary: "Done",
          did_error: false,
          raw_notam: rawNotam(1, "A1"),
        },
        {
          id: 2,
          category: null,
          summary: null,
          did_error: false,
          raw_notam: rawNotam(2, "A2"),
        },
      ],
      [rawNotam(1, "A1"), rawNotam(2, "A2")],
      { includeUnclassifiedRaw: false },
    );

    expect(snapshot.pendingCount).toBe(1);
    expect(snapshot.failedNotams).toEqual([]);
    expect(snapshot.classifiedGroups).toEqual([
      {
        category: 1,
        notams: [
          {
            id: 1,
            category: 1,
            summary: "Done",
            did_error: false,
            raw_notam: rawNotam(1, "A1"),
          },
        ],
      },
    ]);
    expect(snapshot.unclassifiedRawNotams).toEqual([]);
  });

  it("separates failed notams from pending and classified", () => {
    const snapshot = buildFlightAnalysedNotamsSnapshot(
      [
        {
          id: 1,
          category: 1,
          summary: "Done",
          did_error: false,
          raw_notam: rawNotam(1, "A1"),
        },
        {
          id: 2,
          category: null,
          summary: null,
          did_error: true,
          raw_notam: rawNotam(2, "A2"),
        },
        {
          id: 3,
          category: null,
          summary: null,
          did_error: false,
          raw_notam: rawNotam(3, "A3"),
        },
      ],
      [rawNotam(1, "A1"), rawNotam(2, "A2"), rawNotam(3, "A3")],
      { includeUnclassifiedRaw: false },
    );

    expect(snapshot.pendingCount).toBe(1);
    expect(snapshot.failedNotams).toHaveLength(1);
    expect(snapshot.failedNotams[0]?.id).toBe(2);
    expect(snapshot.classifiedGroups).toHaveLength(1);
  });

  it("returns unclassified raw notams for partial finish", () => {
    const snapshot = buildFlightAnalysedNotamsSnapshot(
      [
        {
          id: 1,
          category: 1,
          summary: "Done",
          did_error: false,
          raw_notam: rawNotam(1, "A1"),
        },
      ],
      [rawNotam(1, "A1"), rawNotam(2, "A2"), rawNotam(3, "A3")],
      { includeUnclassifiedRaw: true },
    );

    expect(snapshot.pendingCount).toBe(0);
    expect(snapshot.unclassifiedRawNotams).toEqual([
      rawNotam(2, "A2"),
      rawNotam(3, "A3"),
    ]);
  });
});

describe("groupAnalysedNotamsByCategory", () => {
  it("groups notams by ascending category", () => {
    const notam = (id: number, category: number) => ({
      id,
      category,
      summary: `Summary ${id}`,
      did_error: false,
      raw_notam: {
        id,
        notam_id: `N${id}`,
        title: null,
        q: null,
        a: null,
        b: null,
        c: null,
        d: null,
        e: null,
        f: null,
        g: null,
      },
    });

    expect(
      groupAnalysedNotamsByCategory([
        notam(2, 3),
        notam(1, 1),
        notam(3, 3),
      ]),
    ).toEqual([
      { category: 1, notams: [notam(1, 1)] },
      { category: 3, notams: [notam(2, 3), notam(3, 3)] },
    ]);
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

describe("validateFlightAnalysisRequestPayload", () => {
  it("accepts a valid job id", () => {
    expect(
      validateFlightAnalysisRequestPayload({
        job_id: "33333333-3333-4333-8333-333333333333",
      }),
    ).toEqual({
      valid: true,
      jobId: "33333333-3333-4333-8333-333333333333",
    });
  });

  it("rejects an invalid job id", () => {
    expect(
      validateFlightAnalysisRequestPayload({
        job_id: "not-a-uuid",
      }),
    ).toEqual({
      valid: false,
      error: "Job id is invalid",
    });
  });
});

describe("buildFlightAnalysisRequestBody", () => {
  it("builds the JetOps analysis request payload", () => {
    expect(
      buildFlightAnalysisRequestBody(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ),
    ).toEqual({
      organisation_id: "11111111-1111-4111-8111-111111111111",
      flight_id: "22222222-2222-4222-8222-222222222222",
      job_id: "33333333-3333-4333-8333-333333333333",
      flight_plan_id: "44444444-4444-4444-8444-444444444444",
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
