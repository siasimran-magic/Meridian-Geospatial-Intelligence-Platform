import { NextRequest } from "next/server";
import { getOverviewAnalytics } from "@/lib/analytics/traceAnalytics";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * GET /api/analytics/overview
 * Returns platform-wide aggregate movement metrics using MongoDB $facet aggregation.
 */
export async function GET(_request: NextRequest) {
  try {
    const analytics = await getOverviewAnalytics();
    return successResponse(analytics, "Overview analytics retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
