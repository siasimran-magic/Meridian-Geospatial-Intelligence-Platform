import { NextRequest } from "next/server";
import { getDeviceActivitySummary } from "@/lib/analytics/traceAnalytics";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * GET /api/analytics/devices
 * Groups activity and metrics by deviceId.
 */
export async function GET(_request: NextRequest) {
  try {
    const devicesData = await getDeviceActivitySummary();
    return successResponse(devicesData, "Device activity summary retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
