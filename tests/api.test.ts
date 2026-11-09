import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";
import { NextRequest } from "next/server";
import { GET as getTraces, POST as postTraces } from "../src/app/api/traces/route";
import {
  GET as getTraceById,
  PATCH as patchTrace,
  DELETE as deleteTraceRoute,
} from "../src/app/api/traces/[id]/route";
import { GET as getOverview } from "../src/app/api/analytics/overview/route";
import { GET as getTraceAnalytics } from "../src/app/api/analytics/traces/[id]/route";
import { GET as getUserAnalytics } from "../src/app/api/analytics/users/[userId]/route";
import { setupDatabaseSchemaAndIndexes, TRACES_COLLECTION } from "../src/lib/mongodb";

const TEST_DB_NAME = "geospatial_platform_api_test";
const TEST_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";

describe("Next.js App Router API Routes", () => {
  let client: MongoClient;
  let createdTraceId: string;

  beforeAll(async () => {
    client = new MongoClient(TEST_URI);
    await client.connect();
    const testDb = client.db(TEST_DB_NAME);
    await setupDatabaseSchemaAndIndexes(testDb);
    await testDb.collection(TRACES_COLLECTION).deleteMany({});

    process.env.MONGODB_URI = `${TEST_URI.replace(/\/geospatial_platform$/, "")}/${TEST_DB_NAME}`;
  });

  afterAll(async () => {
    if (client) {
      await client.db(TEST_DB_NAME).dropDatabase();
      await client.close();
    }
  });

  it("POST /api/traces validates and creates a new trace", async () => {
    const payload = {
      userId: "api_pilot_01",
      deviceId: "dev_api_01",
      batteryLevel: 91,
      metadata: { tripType: "commute", notes: "API route test trace" },
      points: [
        {
          timestamp: "2026-10-22T08:00:00Z",
          coordinates: [77.5946, 12.9716],
          speed: 7.2,
          accuracy: 5,
        },
        {
          timestamp: "2026-10-22T08:02:00Z",
          coordinates: [77.6050, 12.9750],
          speed: 8.4,
          accuracy: 6,
        },
        {
          timestamp: "2026-10-22T08:04:00Z",
          coordinates: [77.6150, 12.9800],
          speed: 6.8,
          accuracy: 5,
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/traces", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await postTraces(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    createdTraceId = json.data.id;
  });

  it("POST /api/traces returns 422 for invalid coordinates or missing fields", async () => {
    const invalidPayload = {
      userId: "api_pilot_01",
      batteryLevel: 91,
      points: [
        {
          timestamp: "2026-10-22T08:00:00Z",
          coordinates: [999.0, 12.9716], // Invalid Longitude
          speed: 7.2,
          accuracy: 5,
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/traces", {
      method: "POST",
      body: JSON.stringify(invalidPayload),
    });

    const res = await postTraces(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("GET /api/traces lists traces with pagination", async () => {
    const req = new NextRequest("http://localhost:3000/api/traces?page=1&limit=5");
    const res = await getTraces(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
    expect(json.pagination.page).toBe(1);
  });

  it("GET /api/traces/[id] retrieves a trace", async () => {
    const req = new NextRequest(`http://localhost:3000/api/traces/${createdTraceId}`);
    const res = await getTraceById(req, {
      params: Promise.resolve({ id: createdTraceId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data._id).toBe(createdTraceId);
  });

  it("PATCH /api/traces/[id] updates permitted metadata", async () => {
    const req = new NextRequest(`http://localhost:3000/api/traces/${createdTraceId}`, {
      method: "PATCH",
      body: JSON.stringify({ batteryLevel: 75 }),
    });

    const res = await patchTrace(req, {
      params: Promise.resolve({ id: createdTraceId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.batteryLevel).toBe(75);
  });

  it("GET /api/analytics/overview returns aggregate statistics", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics/overview");
    const res = await getOverview(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalTraces).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/analytics/traces/[id] returns detailed route metrics", async () => {
    const req = new NextRequest(`http://localhost:3000/api/analytics/traces/${createdTraceId}`);
    const res = await getTraceAnalytics(req, {
      params: Promise.resolve({ id: createdTraceId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.durationSeconds).toBe(240);
    expect(json.data.totalDistanceMeters).toBeGreaterThan(1000);
  });

  it("GET /api/analytics/users/[userId] returns user statistics", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics/users/api_pilot_01");
    const res = await getUserAnalytics(req, {
      params: Promise.resolve({ userId: "api_pilot_01" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.userId).toBe("api_pilot_01");
  });

  it("DELETE /api/traces/[id] deletes the trace", async () => {
    const req = new NextRequest(`http://localhost:3000/api/traces/${createdTraceId}`, {
      method: "DELETE",
    });

    const res = await deleteTraceRoute(req, {
      params: Promise.resolve({ id: createdTraceId }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe(true);
  });
});
