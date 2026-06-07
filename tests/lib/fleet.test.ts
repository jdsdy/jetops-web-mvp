import { describe, expect, it } from "vitest";

import {
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
  it("accepts a valid payload", () => {
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
        aircraft_ref_id: 1,
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: false,
      },
    });
  });

  it("rejects a missing aircraft reference id", () => {
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

  it("rejects client-sent manufacturer and model fields", () => {
    expect(
      validateFleetAircraftPayload({
        aircraft_ref_id: 1,
        manufacturer: "Gulfstream",
        model: "G700",
        tail_number: "N123AB",
        seats: 8,
        rnav_equipped: true,
      }),
    ).toEqual({
      valid: false,
      error: "Manufacturer and model are derived from the aircraft reference",
    });
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
