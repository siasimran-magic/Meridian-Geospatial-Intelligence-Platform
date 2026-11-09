import { NextRequest } from "next/server";
import { isValidObjectId } from "@/lib/validations/trace";
import { getTraceAnalytics } from "@/lib/analytics/traceAnalytics";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/analytics/traces/[id]
 * Computes metrics for an individual trace (duration, Haversine distance, speed profiles, segments).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid trace ID format", 400);
    }

    const analytics = await getTraceAnalytics(id);

    if (!analytics) {
      return errorResponse("GPS trace not found", 404);
    }

    return successResponse(analytics, "Trace analytics retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
