import { ObjectId } from "mongodb";
import { getTracesCollection } from "@/lib/mongodb";
import {
  GPSTrace,
  GPSTraceInput,
  GPSTraceUpdateInput,
  TraceFilterQuery,
  TraceSummaryItem,
} from "@/types/gps";
import { isValidObjectId } from "@/lib/validations/trace";
import { computeTraceMetrics } from "@/lib/analytics/haversine";

/**
 * Creates a new GPS trace record in MongoDB.
 */
export async function createTrace(input: GPSTraceInput): Promise<GPSTrace> {
  const collection = await getTracesCollection();

  // Normalize point timestamps to BSON Date objects
  const normalizedPoints = input.points.map((pt) => ({
    timestamp: pt.timestamp instanceof Date ? pt.timestamp : new Date(pt.timestamp),
    coordinates: pt.coordinates,
    speed: Number(pt.speed),
    accuracy: Number(pt.accuracy),
  }));

  // Ensure chronological order
  normalizedPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const now = new Date();
  const documentToInsert: GPSTrace = {
    userId: input.userId.trim(),
    deviceId: input.deviceId.trim(),
    points: normalizedPoints,
    batteryLevel: Number(input.batteryLevel),
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(documentToInsert);
  return {
    ...documentToInsert,
    _id: result.insertedId,
  };
}

/**
 * Retrieves a paginated list of traces with summary metrics (duration, distance, speeds).
 */
export async function listTraces(query: TraceFilterQuery): Promise<{
  traces: TraceSummaryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const collection = await getTracesCollection();
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 10));
  const skip = (page - 1) * limit;

  // Construct MongoDB filter object
  const filter: Record<string, any> = {};

  if (query.userId) {
    filter.userId = query.userId.trim();
  }

  if (query.deviceId) {
    filter.deviceId = query.deviceId.trim();
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      filter.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      filter.createdAt.$lte = new Date(query.endDate);
    }
  }

  const sortDirection = query.sortOrder === "asc" ? 1 : -1;
  const sortStage: Record<string, 1 | -1> =
    query.sortBy === "pointsCount"
      ? { pointsCount: sortDirection }
      : { createdAt: sortDirection };

  const total = await collection.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;

  // Fetch traces matching filter
  const docs = await collection
    .find(filter)
    .sort(sortStage)
    .skip(skip)
    .limit(limit)
    .toArray();

  const traces: TraceSummaryItem[] = docs.map((doc) => {
    const metrics = computeTraceMetrics(
      doc._id?.toString() || "",
      doc.userId,
      doc.deviceId,
      doc.batteryLevel,
      doc.points || []
    );

    return {
      id: doc._id?.toString() || "",
      userId: doc.userId,
      deviceId: doc.deviceId,
      pointsCount: (doc.points || []).length,
      startTime: metrics.startTime,
      endTime: metrics.endTime,
      durationSeconds: metrics.durationSeconds,
      totalDistanceMeters: metrics.totalDistanceMeters,
      avgSpeedMps: metrics.avgRecordedSpeedMps,
      maxSpeedMps: metrics.maxSpeedMps,
      batteryLevel: doc.batteryLevel,
      tripType: doc.metadata?.tripType,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });

  return {
    traces,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves a single GPS trace by its MongoDB ObjectId.
 */
export async function getTraceById(id: string): Promise<GPSTrace | null> {
  if (!isValidObjectId(id)) {
    return null;
  }

  const collection = await getTracesCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Updates permitted metadata fields of an existing GPS trace.
 */
export async function updateTrace(
  id: string,
  updateData: GPSTraceUpdateInput
): Promise<GPSTrace | null> {
  if (!isValidObjectId(id)) {
    return null;
  }

  const collection = await getTracesCollection();

  const setFields: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (typeof updateData.batteryLevel === "number") {
    setFields.batteryLevel = updateData.batteryLevel;
  }

  if (updateData.deviceId) {
    setFields.deviceId = updateData.deviceId.trim();
  }

  if (updateData.metadata) {
    if (updateData.metadata.tripType !== undefined) {
      setFields["metadata.tripType"] = updateData.metadata.tripType;
    }
    if (updateData.metadata.notes !== undefined) {
      setFields["metadata.notes"] = updateData.metadata.notes;
    }
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: setFields },
    { returnDocument: "after" }
  );

  return result || null;
}

/**
 * Deletes a GPS trace by its MongoDB ObjectId.
 */
export async function deleteTrace(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) {
    return false;
  }

  const collection = await getTracesCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
