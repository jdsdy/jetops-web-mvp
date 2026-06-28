import { describe, expect, it, vi } from "vitest";

import {
  getPersonalFleet,
  groupAircraftReferenceByManufacturer,
  validateFleetAircraftPayload,
  validateFleetAircraftUpdatePayload,
} from "@/lib/fleet";

describe("groupAircraftReferenceByManufacturer", () => {
  it("groups models under manufacturers in sorted order", () => {
    expect(
      groupAircraftReferenceByManufacturer([
        { id: 3, manufacturer: "Bombardier", model: "Global 6500" },
        { id: 2, manufacturer: "Gulfstream", model: "G650" },
        { id: 1, manufacturer: "Gulfstream", model: "G700" },
      ]),
    ).toEqual([
      {
        manufacturer: "Bombardier",
        models: [{ id: 3, model: "Global 6500" }],
      },
      {
        manufacturer: "Gulfstream",
        models: [
          { id: 2, model: "G650" },
          { id: 1, model: "G700" },
        ],
      },
    ]);
  });

  it("returns an empty array when given no rows", () => {
    expect(groupAircraftReferenceByManufacturer([])).toEqual([]);
  });
});

describe("validateFleetAircraftPayload", () => {
  it("accepts a valid reference payload", () => {
    expect(
      validateFleetAircraftPayload({
        aircraft_ref_id: 1,
        tail_number: " N123AB ",
        seats: 8,
        rnav_equipped: false,
      }),
    ).toEqual({
      valid: true,
      payload: {
        kind: "reference",
        aircraft_ref_id: 1,
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: false,
      },
    });
  });

  it("accepts a valid custom aircraft payload", () => {
    expect(
      validateFleetAircraftPayload({
        manufacturer: " Pilatus ",
        model: " PC-24 ",
        tail_number: "N999ZZ",
        seats: 8,
        rnav_equipped: true,
        icao_wtc: "M",
        weight_class: "Small+",
        wingspan_ft: 100,
        length_ft: 55.5,
        aac: "C",
        adg: "D",
      }),
    ).toEqual({
      valid: true,
      payload: {
        kind: "custom",
        manufacturer: "Pilatus",
        model: "PC-24",
        tail_number: "N999ZZ",
        seats: 8,
        rnav_equipped: true,
        custom_data: {
          icao_wtc: "M",
          weight_class: "Small+",
          wingspan_ft: 100,
          length_ft: 55.5,
          wingspan_m: 30.48,
          length_m: 16.92,
          aac: "C",
          adg: "D",
        },
      },
    });
  });

  it("rejects mixing reference and custom fields", () => {
    expect(
      validateFleetAircraftPayload({
        aircraft_ref_id: 1,
        manufacturer: "Gulfstream",
        model: "G700",
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: true,
        icao_wtc: "H",
        weight_class: "Heavy",
        wingspan_ft: 99,
        length_ft: 99,
        aac: "D",
        adg: "D",
      }),
    ).toEqual({
      valid: false,
      error: "Provide either aircraft_ref_id or custom aircraft details, not both",
    });
  });

  it("rejects a missing aircraft reference id for reference aircraft", () => {
    expect(
      validateFleetAircraftPayload({
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: false,
      }),
    ).toEqual({
      valid: false,
      error: "Aircraft reference is required",
    });
  });

  it("rejects an invalid seats value", () => {
    expect(
      validateFleetAircraftPayload({
        aircraft_ref_id: 1,
        tail_number: "N123AB",
        seats: 0,
        rnav_equipped: false,
      }),
    ).toEqual({
      valid: false,
      error: "Seats must be between 1 and 32767",
    });
  });

  it("rejects custom aircraft with missing dimensions", () => {
    expect(
      validateFleetAircraftPayload({
        manufacturer: "Pilatus",
        model: "PC-24",
        tail_number: "N999ZZ",
        seats: 8,
        rnav_equipped: true,
        icao_wtc: "M",
        weight_class: "Small",
        wingspan_ft: 0,
        length_ft: 55.5,
        aac: "C",
        adg: "D",
      }),
    ).toEqual({
      valid: false,
      error: "Wingspan must be greater than zero",
    });
  });
});

describe("convertFeetToMeters", () => {
  it("converts feet to meters rounded to two decimal places", async () => {
    const { convertFeetToMeters } = await import("@/lib/fleet");

    expect(convertFeetToMeters(100)).toBe(30.48);
    expect(convertFeetToMeters(55.5)).toBe(16.92);
  });
});

describe("validateFleetAircraftUpdatePayload", () => {
  it("accepts a valid update payload", () => {
    expect(
      validateFleetAircraftUpdatePayload({
        tail_number: " N456CD ",
        seats: 10,
        rnav_equipped: true,
      }),
    ).toEqual({
      valid: true,
      payload: {
        tail_number: "N456CD",
        seats: 10,
        rnav_equipped: true,
      },
    });
  });

  it("rejects client-sent custom data", () => {
    expect(
      validateFleetAircraftUpdatePayload({
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: false,
        custom_data: "notes",
      }),
    ).toEqual({
      valid: false,
      error: "Custom data cannot be updated yet",
    });
  });

  it("rejects client-sent manufacturer and model fields", () => {
    expect(
      validateFleetAircraftUpdatePayload({
        manufacturer: "Gulfstream",
        model: "G700",
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: false,
      }),
    ).toEqual({
      valid: false,
      error: "Manufacturer and model cannot be changed",
    });
  });

  it("rejects an invalid tail number", () => {
    expect(
      validateFleetAircraftUpdatePayload({
        tail_number: "   ",
        seats: 8,
        rnav_equipped: false,
      }),
    ).toEqual({
      valid: false,
      error: "Tail number is required",
    });
  });
});

describe("getPersonalFleet", () => {
  it("loads fleet aircraft scoped by user id", async () => {
    const fleet = [
      {
        id: "aircraft-1",
        manufacturer: "Gulfstream",
        model: "G700",
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: false,
      },
    ];

    const orderTail = vi.fn().mockResolvedValue({ data: fleet, error: null });
    const orderModel = vi.fn().mockReturnValue({ order: orderTail });
    const orderManufacturer = vi.fn().mockReturnValue({ order: orderModel });
    const eq = vi.fn().mockReturnValue({ order: orderManufacturer });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const supabase = { from };

    const result = await getPersonalFleet(supabase as never, "user-1");

    expect(from).toHaveBeenCalledWith("fleet_aircraft");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual(fleet);
  });
});
