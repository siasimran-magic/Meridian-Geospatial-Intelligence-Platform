import { ObjectId } from "mongodb";
import { getTracesCollection } from "@/lib/mongodb";
import {
  DailyActivityItem,
  DeviceActivityItem,
  OverviewAnalytics,
  TraceAnalyticsResult,
  UserAnalytics,
} from "@/types/gps";
import { isValidObjectId } from "@/lib/validations/trace";
import {
  computeTraceMetrics,
  getMongoHaversineExpression,
} from "@/lib/analytics/haversine";

/**
 * MongoDB Aggregation Pipeline: Overview Analytics
 *
 * Demonstrates:
 * - $facet stage: executing multiple independent aggregation sub-pipelines in parallel
 * - $project with array operations ($size)
 * - $group with accumulators ($sum, $avg, $max, $addToSet)
 * - MongoDB Haversine expression evaluation
 */
export async function getOverviewAnalytics(): Promise<OverviewAnalytics> {
  const collection = await getTracesCollection();

  const haversineDistanceExpr = getMongoHaversineExpression();

  const pipeline = [
    {
      $facet: {
        summary: [
          {
            $project: {
              userId: 1,
              deviceId: 1,
              pointsCount: { $size: { $ifNull: ["$points", []] } },
              avgSpeed: { $avg: "$points.speed" },
              maxSpeed: { $max: "$points.speed" },
              distanceMeters: haversineDistanceExpr,
            },
          },
          {
            $group: {
              _id: null,
              totalTraces: { $sum: 1 },
              totalPoints: { $sum: "$pointsCount" },
              totalDistanceMeters: { $sum: "$distanceMeters" },
              overallAvgSpeedMps: { $avg: "$avgSpeed" },
              overallMaxSpeedMps: { $max: "$maxSpeed" },
              users: { $addToSet: "$userId" },
              devices: { $addToSet: "$deviceId" },
            },
          },
        ],
        latest: [
          { $sort: { createdAt: -1 as const } },
          { $limit: 1 },
          {
            $project: {
              _id: 1,
              userId: 1,
              deviceId: 1,
              createdAt: 1,
              pointsCount: { $size: { $ifNull: ["$points", []] } },
            },
          },
        ],
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const facetResult = results[0] || {};
  const summary = facetResult.summary?.[0];
  const latest = facetResult.latest?.[0];

  const totalTraces = summary?.totalTraces || 0;
  const totalPoints = summary?.totalPoints || 0;
  const totalDistanceMeters = summary?.totalDistanceMeters || 0;
  const totalDistanceKm = Math.round((totalDistanceMeters / 1000) * 100) / 100;
  const overallAvgSpeedMps = summary?.overallAvgSpeedMps
    ? Math.round(summary.overallAvgSpeedMps * 100) / 100
    : 0;
  const overallAvgSpeedKmh = Math.round(overallAvgSpeedMps * 3.6 * 100) / 100;
  const overallMaxSpeedMps = summary?.overallMaxSpeedMps
    ? Math.round(summary.overallMaxSpeedMps * 100) / 100
    : 0;
  const overallMaxSpeedKmh = Math.round(overallMaxSpeedMps * 3.6 * 100) / 100;
  const uniqueUsersCount = summary?.users ? summary.users.length : 0;
  const uniqueDevicesCount = summary?.devices ? summary.devices.length : 0;

  return {
    totalTraces,
    totalPoints,
    totalDistanceMeters: Math.round(totalDistanceMeters * 100) / 100,
    totalDistanceKm,
    overallAvgSpeedMps,
    overallAvgSpeedKmh,
    overallMaxSpeedMps,
    overallMaxSpeedKmh,
    uniqueUsersCount,
    uniqueDevicesCount,
    latestTrace: latest
      ? {
          id: latest._id.toString(),
          userId: latest.userId,
          deviceId: latest.deviceId,
          createdAt: latest.createdAt,
          pointsCount: latest.pointsCount,
        }
      : null,
  };
}

/**
 * MongoDB Aggregation Pipeline: Single Trace Analytics
 *
 * Demonstrates:
 * - $match by ObjectId
 * - Pure server-side computation and transformation
 */
export async function getTraceAnalytics(traceId: string): Promise<TraceAnalyticsResult | null> {
  if (!isValidObjectId(traceId)) {
    return null;
  }

  const collection = await getTracesCollection();
  const trace = await collection.findOne({ _id: new ObjectId(traceId) });

  if (!trace) {
    return null;
  }

  return computeTraceMetrics(
    trace._id?.toString() || traceId,
    trace.userId,
    trace.deviceId,
    trace.batteryLevel,
    trace.points || []
  );
}

/**
 * MongoDB Aggregation Pipeline: User Movement Analytics
 *
 * Demonstrates:
 * - $match by user identifier
 * - Haversine distance aggregation
 * - Aggregation grouping by user with accumulators
 */
export async function getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
  const collection = await getTracesCollection();

  const haversineDistanceExpr = getMongoHaversineExpression();

  const pipeline = [
    { $match: { userId: userId.trim() } },
    {
      $project: {
        userId: 1,
        deviceId: 1,
        createdAt: 1,
        pointsCount: { $size: { $ifNull: ["$points", []] } },
        avgSpeed: { $avg: "$points.speed" },
        maxSpeed: { $max: "$points.speed" },
        distanceMeters: haversineDistanceExpr,
      },
    },
    {
      $group: {
        _id: "$userId",
        tracesCount: { $sum: 1 },
        totalPoints: { $sum: "$pointsCount" },
        totalDistanceMeters: { $sum: "$distanceMeters" },
        avgSpeedMps: { $avg: "$avgSpeed" },
        maxSpeedMps: { $max: "$maxSpeed" },
        devices: { $addToSet: "$deviceId" },
        firstActive: { $min: "$createdAt" },
        lastActive: { $max: "$createdAt" },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  const record = results[0];

  if (!record) {
    return null;
  }

  const totalDistanceMeters = Math.round((record.totalDistanceMeters || 0) * 100) / 100;
  const totalDistanceKm = Math.round((totalDistanceMeters / 1000) * 100) / 100;
  const avgSpeedMps = record.avgSpeedMps ? Math.round(record.avgSpeedMps * 100) / 100 : 0;
  const avgSpeedKmh = Math.round(avgSpeedMps * 3.6 * 100) / 100;
  const maxSpeedMps = record.maxSpeedMps ? Math.round(record.maxSpeedMps * 100) / 100 : 0;

  return {
    userId,
    tracesCount: record.tracesCount || 0,
    totalPoints: record.totalPoints || 0,
    totalDistanceMeters,
    totalDistanceKm,
    avgSpeedMps,
    avgSpeedKmh,
    maxSpeedMps,
    devices: record.devices || [],
    firstActive: record.firstActive || null,
    lastActive: record.lastActive || null,
  };
}

/**
 * MongoDB Aggregation Pipeline: Daily Movement Summary
 *
 * Demonstrates:
 * - $project with $dateToString for temporal grouping
 * - $group by formatted date string
 * - Accumulators for active users, distance, points, and average speed
 */
export async function getDailyMovementSummary(): Promise<DailyActivityItem[]> {
  const collection = await getTracesCollection();

  const haversineDistanceExpr = getMongoHaversineExpression();

  const pipeline = [
    {
      $project: {
        dateStr: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        userId: 1,
        pointsCount: { $size: { $ifNull: ["$points", []] } },
        avgSpeed: { $avg: "$points.speed" },
        distanceMeters: haversineDistanceExpr,
      },
    },
    {
      $group: {
        _id: "$dateStr",
        traceCount: { $sum: 1 },
        totalPoints: { $sum: "$pointsCount" },
        totalDistanceMeters: { $sum: "$distanceMeters" },
        avgSpeedMps: { $avg: "$avgSpeed" },
        activeUsers: { $addToSet: "$userId" },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map((row) => {
    const totalDistanceKm = Math.round(((row.totalDistanceMeters || 0) / 1000) * 100) / 100;
    const avgSpeedMps = row.avgSpeedMps ? Math.round(row.avgSpeedMps * 100) / 100 : 0;
    const avgSpeedKmh = Math.round(avgSpeedMps * 3.6 * 100) / 100;

    return {
      date: row._id,
      traceCount: row.traceCount || 0,
      totalPoints: row.totalPoints || 0,
      totalDistanceKm,
      avgSpeedKmh,
      activeUsers: row.activeUsers ? row.activeUsers.length : 0,
    };
  });
}

/**
 * MongoDB Aggregation Pipeline: Device Activity Summary
 *
 * Demonstrates:
 * - $group by deviceId
 * - $addToSet to trace distinct users per device
 * - Calculation of total distance and speeds per device
 */
export async function getDeviceActivitySummary(): Promise<DeviceActivityItem[]> {
  const collection = await getTracesCollection();

  const haversineDistanceExpr = getMongoHaversineExpression();

  const pipeline = [
    {
      $project: {
        deviceId: 1,
        userId: 1,
        pointsCount: { $size: { $ifNull: ["$points", []] } },
        avgSpeed: { $avg: "$points.speed" },
        distanceMeters: haversineDistanceExpr,
      },
    },
    {
      $group: {
        _id: "$deviceId",
        traceCount: { $sum: 1 },
        totalPoints: { $sum: "$pointsCount" },
        totalDistanceMeters: { $sum: "$distanceMeters" },
        avgSpeedMps: { $avg: "$avgSpeed" },
        users: { $addToSet: "$userId" },
      },
    },
    { $sort: { traceCount: -1 as const } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map((row) => {
    const totalDistanceKm = Math.round(((row.totalDistanceMeters || 0) / 1000) * 100) / 100;
    const avgSpeedMps = row.avgSpeedMps ? Math.round(row.avgSpeedMps * 100) / 100 : 0;
    const avgSpeedKmh = Math.round(avgSpeedMps * 3.6 * 100) / 100;

    return {
      deviceId: row._id,
      traceCount: row.traceCount || 0,
      totalPoints: row.totalPoints || 0,
      totalDistanceKm,
      avgSpeedKmh,
      users: row.users || [],
    };
  });
}

/**
 * Aggregation for trace-level comparison chart
 */
export async function getTracesChartData(limit = 15): Promise<{
  id: string;
  label: string;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointsCount: number;
}[]> {
  const collection = await getTracesCollection();
  const docs = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();

  return docs.map((doc, idx) => {
    const metrics = computeTraceMetrics(
      doc._id.toString(),
      doc.userId,
      doc.deviceId,
      doc.batteryLevel,
      doc.points || []
    );

    return {
      id: doc._id.toString(),
      label: `Trace ${idx + 1} (${doc.userId})`,
      distanceKm: metrics.totalDistanceKm,
      avgSpeedKmh: metrics.avgRecordedSpeedKmh,
      maxSpeedKmh: metrics.maxSpeedKmh,
      pointsCount: (doc.points || []).length,
    };
  });
}
