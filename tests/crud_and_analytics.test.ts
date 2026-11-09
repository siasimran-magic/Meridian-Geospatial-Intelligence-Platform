import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient, ObjectId } from "mongodb";
import { setupDatabaseSchemaAndIndexes, DB_NAME, TRACES_COLLECTION } from "../src/lib/mongodb";
import {
  createTrace,
  getTraceById,
  listTraces,
  updateTrace,
  deleteTrace,
} from "../src/lib/services/traceService";
import {
  getOverviewAnalytics,
  getTraceAnalytics,
  getUserAnalytics,
  getDailyMovementSummary,
  getDeviceActivitySummary,
} from "../src/lib/analytics/traceAnalytics";

const TEST_DB_NAME = "geospatial_platform_test";
const TEST_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";

describe("MongoDB CRUD Operations & Aggregation Pipelines (Isolated Test DB)", () => {
  let client: MongoClient;
  let testTraceId: string;

  beforeAll(async () => {
    client = new MongoClient(TEST_URI);
    await client.connect();
    const testDb = client.db(TEST_DB_NAME);

    // Initialize Schema validation & indexes
    await setupDatabaseSchemaAndIndexes(testDb);

    // Clean any leftover test collection
    await testDb.collection(TRACES_COLLECTION).deleteMany({});

    // Override MONGODB_URI for service calls in this test process
    process.env.MONGODB_URI = `${TEST_URI.replace(/\/geospatial_platform$/, "")}/${TEST_DB_NAME}`;
  });

  afterAll(async () => {
    if (client) {
      // Clean up test database
      await client.db(TEST_DB_NAME).dropDatabase();
      await client.close();
    }
  });

  it("creates a new GPS trace with normalized dates and embedded points", async () => {
    const newTrace = await createTrace({
      userId: "test_pilot_1",
      deviceId: "dev_pilot_alpha",
      batteryLevel: 94,
      metadata: { tripType: "test_flight", notes: "Integration test run" },
      points: [
        {
          timestamp: new Date("2026-10-22T08:00:00Z"),
          coordinates: [77.5946, 12.9716],
          speed: 8.5,
          accuracy: 5,
        },
        {
          timestamp: new Date("2026-10-22T08:02:00Z"),
          coordinates: [77.6050, 12.9750],
          speed: 10.2,
          accuracy: 6,
        },
        {
          timestamp: new Date("2026-10-22T08:05:00Z"),
          coordinates: [77.6150, 12.9800],
          speed: 9.1,
          accuracy: 5,
        },
      ],
    });

    expect(newTrace._id).toBeDefined();
    testTraceId = newTrace._id!.toString();
    expect(newTrace.userId).toBe("test_pilot_1");
    expect(newTrace.points.length).toBe(3);
    expect(newTrace.createdAt instanceof Date).toBe(true);
  });

  it("retrieves a trace by its MongoDB ObjectId", async () => {
    const fetched = await getTraceById(testTraceId);
    expect(fetched).not.toBeNull();
    expect(fetched?.userId).toBe("test_pilot_1");
    expect(fetched?.deviceId).toBe("dev_pilot_alpha");
  });

  it("returns null for non-existent or invalid trace ID", async () => {
    const notFound = await getTraceById(new ObjectId().toString());
    expect(notFound).toBeNull();

    const invalid = await getTraceById("not-a-valid-id");
    expect(invalid).toBeNull();
  });

  it("lists traces with filtering and pagination", async () => {
    const result = await listTraces({
      userId: "test_pilot_1",
      page: 1,
      limit: 10,
    });

    expect(result.traces.length).toBe(1);
    expect(result.pagination.total).toBe(1);
    expect(result.traces[0].pointsCount).toBe(3);
    expect(result.traces[0].totalDistanceMeters).toBeGreaterThan(1000);
  });

  it("updates permitted metadata fields (batteryLevel and notes)", async () => {
    const updated = await updateTrace(testTraceId, {
      batteryLevel: 88,
      metadata: { tripType: "test_flight", notes: "Updated status" },
    });

    expect(updated).not.toBeNull();
    expect(updated?.batteryLevel).toBe(88);
    expect(updated?.metadata?.notes).toBe("Updated status");
  });

  it("executes single trace analytics aggregation pipeline", async () => {
    const analytics = await getTraceAnalytics(testTraceId);
    expect(analytics).not.toBeNull();
    expect(analytics?.pointsCount).toBe(3);
    expect(analytics?.durationSeconds).toBe(300); // 5 minutes (08:00 to 08:05)
    expect(analytics?.maxSpeedMps).toBe(10.2);
    expect(analytics?.segments.length).toBe(2);
  });

  it("executes user-level movement aggregation pipeline", async () => {
    const userStats = await getUserAnalytics("test_pilot_1");
    expect(userStats).not.toBeNull();
    expect(userStats?.tracesCount).toBe(1);
    expect(userStats?.totalPoints).toBe(3);
    expect(userStats?.devices).toContain("dev_pilot_alpha");
  });

  it("executes platform overview analytics aggregation pipeline", async () => {
    const overview = await getOverviewAnalytics();
    expect(overview.totalTraces).toBeGreaterThanOrEqual(1);
    expect(overview.totalPoints).toBeGreaterThanOrEqual(3);
    expect(overview.uniqueUsersCount).toBeGreaterThanOrEqual(1);
  });

  it("executes daily and device activity aggregations", async () => {
    const daily = await getDailyMovementSummary();
    expect(daily.length).toBeGreaterThanOrEqual(1);

    const devices = await getDeviceActivitySummary();
    expect(devices.length).toBeGreaterThanOrEqual(1);
    expect(devices[0].deviceId).toBe("dev_pilot_alpha");
  });

  it("deletes a trace and verifies deletion", async () => {
    const deleted = await deleteTrace(testTraceId);
    expect(deleted).toBe(true);

    const check = await getTraceById(testTraceId);
    expect(check).toBeNull();
  });
});
