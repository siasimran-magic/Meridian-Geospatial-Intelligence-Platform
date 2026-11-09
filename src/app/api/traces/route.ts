import { NextRequest } from "next/server";
import { GPSTraceCreateSchema, TraceFilterSchema } from "@/lib/validations/trace";
import { createTrace, listTraces } from "@/lib/services/traceService";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * GET /api/traces
 * Lists traces with pagination and filters (userId, deviceId, startDate, endDate, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      userId: searchParams.get("userId") || undefined,
      deviceId: searchParams.get("deviceId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };

    const parsedQuery = TraceFilterSchema.parse(rawParams);
    const { traces, pagination } = await listTraces(parsedQuery);

    return successResponse(traces, "Traces retrieved successfully", 200, {
      pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/traces
 * Validates and stores a new GPS trace with embedded points.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = GPSTraceCreateSchema.parse(body);

    const created = await createTrace(validatedData);

    return successResponse(
      {
        id: created._id?.toString(),
        userId: created.userId,
        deviceId: created.deviceId,
        pointsCount: created.points.length,
        batteryLevel: created.batteryLevel,
        createdAt: created.createdAt,
      },
      "GPS trace created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
