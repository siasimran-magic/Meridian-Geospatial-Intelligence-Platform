import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistance,
  computeTraceMetrics,
} from "../src/lib/analytics/haversine";
import { GPSPoint } from "../src/types/gps";

describe("Geospatial Distance & Analytics Mathematics", () => {
  it("calculates 0 distance for identical coordinates", () => {
    const coord: [number, number] = [77.5946, 12.9716];
    const dist = calculateHaversineDistance(coord, coord);
    expect(dist).toBe(0);
  });

  it("calculates accurate geographic distance for known Bengaluru coordinates", () => {
    // MG Road Metro [77.6080, 12.9730] to Indiranagar 100ft Road [77.6410, 12.9780]
    // Great-circle distance is approx 3585 - 3610 meters (~3.6 km)
    const mgRoad: [number, number] = [77.6080, 12.9730];
    const indiranagar: [number, number] = [77.6410, 12.9780];

    const distMeters = calculateHaversineDistance(mgRoad, indiranagar);
    expect(distMeters).toBeGreaterThan(3500);
    expect(distMeters).toBeLessThan(3700);
  });

  it("handles out of bound or invalid coordinates gracefully", () => {
    const invalidLon: [number, number] = [200, 12.9716];
    const valid: [number, number] = [77.5946, 12.9716];
    expect(calculateHaversineDistance(invalidLon, valid)).toBe(0);

    const invalidLat: [number, number] = [77.5946, 95];
    expect(calculateHaversineDistance(valid, invalidLat)).toBe(0);
  });

  it("computes duration, distance, and distinguishes recorded vs calculated speed", () => {
    const baseTime = new Date("2026-10-22T10:00:00Z");
    const points: GPSPoint[] = [
      {
        timestamp: baseTime,
        coordinates: [77.6080, 12.9730],
        speed: 10, // 10 m/s
        accuracy: 5,
      },
      {
        timestamp: new Date(baseTime.getTime() + 60000), // +60s
        coordinates: [77.6185, 12.9742],
        speed: 14, // 14 m/s
        accuracy: 6,
      },
      {
        timestamp: new Date(baseTime.getTime() + 120000), // +120s
        coordinates: [77.6290, 12.9755],
        speed: 12, // 12 m/s
        accuracy: 5,
      },
    ];

    const metrics = computeTraceMetrics("test_trace_1", "user_test", "dev_test", 80, points);

    // Duration: 120 seconds
    expect(metrics.durationSeconds).toBe(120);
    expect(metrics.durationFormatted).toBe("2m 0s");

    // Total distance > 2000 meters
    expect(metrics.totalDistanceMeters).toBeGreaterThan(2000);
    expect(metrics.totalDistanceKm).toBeGreaterThan(2.0);

    // Recorded avg speed = (10 + 14 + 12) / 3 = 12 m/s
    expect(metrics.avgRecordedSpeedMps).toBe(12);
    expect(metrics.avgRecordedSpeedKmh).toBe(43.2);

    // Max speed = 14 m/s
    expect(metrics.maxSpeedMps).toBe(14);
    expect(metrics.maxSpeedKmh).toBe(50.4);

    // Calculated speed = totalDistance / 120s
    expect(metrics.calculatedAvgSpeedMps).toBeGreaterThan(15);

    // Segments count should be points.length - 1 = 2
    expect(metrics.segments.length).toBe(2);
  });

  it("safely handles empty points array and zero speeds", () => {
    const metrics = computeTraceMetrics("empty_trace", "user_0", "dev_0", 50, []);
    expect(metrics.pointsCount).toBe(0);
    expect(metrics.totalDistanceMeters).toBe(0);
    expect(metrics.durationSeconds).toBe(0);
    expect(metrics.avgRecordedSpeedMps).toBe(0);
    expect(metrics.maxSpeedMps).toBe(0);
  });
});
