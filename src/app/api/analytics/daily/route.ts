import { NextRequest } from "next/server";
import { getDailyMovementSummary } from "@/lib/analytics/traceAnalytics";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * GET /api/analytics/daily
 * Groups movement analytics chronologically by day.
 */
export async function GET(_request: NextRequest) {
  try {
    const dailyData = await getDailyMovementSummary();
    return successResponse(dailyData, "Daily movement summary retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
