import { describe, it, expect } from "vitest";
import {
  GPSTraceCreateSchema,
  GPSTraceUpdateSchema,
  TraceFilterSchema,
  isValidObjectId,
} from "../src/lib/validations/trace";

describe("GPS Data Schema & API Validation", () => {
  it("validates a properly structured GPS trace upload payload", () => {
    const validPayload = {
      userId: "user_test_01",
      deviceId: "dev_test_01",
      batteryLevel: 85,
      metadata: { tripType: "delivery", notes: "Test note" },
      points: [
        {
          timestamp: "2026-10-22T09:00:00Z",
          coordinates: [77.5946, 12.9716],
          speed: 5.2,
          accuracy: 8,
        },
        {
          timestamp: "2026-10-22T09:05:00Z",
          coordinates: [77.61, 12.98],
          speed: 6.1,
          accuracy: 7,
        },
      ],
    };

    const result = GPSTraceCreateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects trace with invalid longitude or latitude", () => {
    const invalidCoordsPayload = {
      userId: "user_test_01",
      deviceId: "dev_test_01",
      batteryLevel: 85,
      points: [
        {
          timestamp: "2026-10-22T09:00:00Z",
          coordinates: [195.0, 12.9716], // Longitude > 180
          speed: 5.2,
          accuracy: 8,
        },
        {
          timestamp: "2026-10-22T09:05:00Z",
          coordinates: [77.61, 12.98],
          speed: 6.1,
          accuracy: 7,
        },
      ],
    };

    const result = GPSTraceCreateSchema.safeParse(invalidCoordsPayload);
    expect(result.success).toBe(false);
  });

  it("rejects trace with missing required fields", () => {
    const missingUser = {
      deviceId: "dev_test_01",
      batteryLevel: 85,
      points: [
        {
          timestamp: "2026-10-22T09:00:00Z",
          coordinates: [77.5946, 12.9716],
          speed: 5.2,
          accuracy: 8,
        },
        {
          timestamp: "2026-10-22T09:05:00Z",
          coordinates: [77.61, 12.98],
          speed: 6.1,
          accuracy: 7,
        },
      ],
    };

    const result = GPSTraceCreateSchema.safeParse(missingUser);
    expect(result.success).toBe(false);
  });

  it("enforces minimum of 2 GPS points for a route trace", () => {
    const singlePoint = {
      userId: "user_test_01",
      deviceId: "dev_test_01",
      batteryLevel: 85,
      points: [
        {
          timestamp: "2026-10-22T09:00:00Z",
          coordinates: [77.5946, 12.9716],
          speed: 5.2,
          accuracy: 8,
        },
      ],
    };

    const result = GPSTraceCreateSchema.safeParse(singlePoint);
    expect(result.success).toBe(false);
  });

  it("strictly disallows updating forbidden fields like points or userId via PATCH schema", () => {
    const invalidUpdate = {
      batteryLevel: 90,
      userId: "hacker_user", // Forbidden modification
    };

    const result = GPSTraceUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);

    const validUpdate = {
      batteryLevel: 90,
      metadata: { notes: "Updated battery" },
    };
    expect(GPSTraceUpdateSchema.safeParse(validUpdate).success).toBe(true);
  });

  it("validates MongoDB 24-character hexadecimal ObjectId format", () => {
    expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isValidObjectId("invalid-id")).toBe(false);
    expect(isValidObjectId("12345")).toBe(false);
    expect(isValidObjectId("zzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false);
  });

  it("validates and defaults query filter parameters", () => {
    const parsed = TraceFilterSchema.parse({
      page: "2",
      limit: "25",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
    expect(parsed.sortBy).toBe("createdAt");
    expect(parsed.sortOrder).toBe("desc");
  });
});
