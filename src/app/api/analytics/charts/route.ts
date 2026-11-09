import { NextRequest } from "next/server";
import { getTracesChartData } from "@/lib/analytics/traceAnalytics";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * GET /api/analytics/charts
 * Returns comparison data (distance, speed) across recent traces for dashboard charts.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit")) || 15));

    const chartData = await getTracesChartData(limit);
    return successResponse(chartData, "Chart comparison data retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
