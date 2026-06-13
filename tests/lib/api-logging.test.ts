import { afterEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

describe("resolveApiLogPath", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("returns the request pathname when it starts with /api", async () => {
    const { resolveApiLogPath } = await import("@/lib/api-logging");
    const request = new Request(
      "https://example.com/api/organisations/org-1/flights?jobId=1",
    );

    expect(resolveApiLogPath(request)).toBe(
      "/api/organisations/org-1/flights",
    );
  });

  it("rejects paths outside /api", async () => {
    const { resolveApiLogPath } = await import("@/lib/api-logging");
    const request = new Request("https://example.com/app/personal");

    expect(() => resolveApiLogPath(request)).toThrow(/\/api/);
  });
});

describe("parseOrganisationIdFromApiPath", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("extracts the organisation id from organisation API routes", async () => {
    const { parseOrganisationIdFromApiPath } = await import("@/lib/api-logging");

    expect(
      parseOrganisationIdFromApiPath(
        "/api/organisations/11111111-1111-4111-8111-111111111111/flights",
      ),
    ).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("returns null for routes without an organisation segment", async () => {
    const { parseOrganisationIdFromApiPath } = await import("@/lib/api-logging");

    expect(parseOrganisationIdFromApiPath("/api/aircraft-reference")).toBeNull();
  });
});

describe("extractApiLogErrorMessage", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("returns null for successful responses without reading the body", async () => {
    const { extractApiLogErrorMessage } = await import("@/lib/api-logging");
    const response = Response.json({ data: "secret payload" }, { status: 200 });

    await expect(extractApiLogErrorMessage(response)).resolves.toBeNull();
  });

  it("returns the error field for failed JSON responses", async () => {
    const { extractApiLogErrorMessage } = await import("@/lib/api-logging");
    const response = Response.json({ error: "Forbidden" }, { status: 403 });

    await expect(extractApiLogErrorMessage(response)).resolves.toBe("Forbidden");
  });
});

describe("buildApiLogInsert", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("builds a log row without request or success response bodies", async () => {
    const { buildApiLogInsert } = await import("@/lib/api-logging");
    const request = new Request("https://example.com/api/aircraft-reference", {
      method: "GET",
    });
    const response = Response.json({ manufacturers: [] }, { status: 200 });

    expect(
      buildApiLogInsert({
        request,
        response,
        durationMs: 42,
        userId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toEqual({
      service: "nextjs",
      method: "GET",
      path: "/api/aircraft-reference",
      status_code: 200,
      user_id: "22222222-2222-4222-8222-222222222222",
      organisation_id: null,
      duration_ms: 42,
      error_message: null,
    });
  });
});

describe("withApiLogging", () => {
  afterEach(() => {
    insertMock.mockClear();
    vi.resetModules();
  });

  it("writes an API log entry after the handler completes", async () => {
    const { withApiLogging } = await import("@/lib/api-logging");
    const request = new Request(
      "https://example.com/api/organisations/org-1/flights/flight-1",
      { method: "PATCH" },
    );

    const response = await withApiLogging(request, async (logContext) => {
      logContext.set({
        userId: "22222222-2222-4222-8222-222222222222",
        organisationId: "11111111-1111-4111-8111-111111111111",
      });

      return Response.json({ ok: true }, { status: 200 });
    });

    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith({
      service: "nextjs",
      method: "PATCH",
      path: "/api/organisations/org-1/flights/flight-1",
      status_code: 200,
      user_id: "22222222-2222-4222-8222-222222222222",
      organisation_id: "11111111-1111-4111-8111-111111111111",
      duration_ms: expect.any(Number),
      error_message: null,
    });
  });

  it("records handler failures without logging request bodies", async () => {
    const { withApiLogging } = await import("@/lib/api-logging");
    const request = new Request("https://example.com/api/aircraft-reference", {
      method: "POST",
      body: JSON.stringify({ secret: "payload" }),
      headers: { "Content-Type": "application/json" },
    });

    await withApiLogging(request, async () =>
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 401,
        error_message: "Unauthorized",
        user_id: null,
        organisation_id: null,
      }),
    );
  });

  it("records unexpected handler errors", async () => {
    const { withApiLogging } = await import("@/lib/api-logging");
    const request = new Request("https://example.com/api/aircraft-reference");

    const response = await withApiLogging(request, async () => {
      throw new Error("Database unavailable");
    });

    expect(response.status).toBe(500);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status_code: 500,
        error_message: "Database unavailable",
      }),
    );
  });
});
