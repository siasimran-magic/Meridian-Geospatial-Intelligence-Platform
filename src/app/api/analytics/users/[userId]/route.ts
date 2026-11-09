import { NextRequest } from "next/server";
import { getUserAnalytics } from "@/lib/analytics/traceAnalytics";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/analytics/users/[userId]
 * Aggregates all movement data for a given user across traces and devices.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    if (!userId || userId.trim().length === 0) {
      return errorResponse("User ID is required", 400);
    }

    const analytics = await getUserAnalytics(userId);

    if (!analytics) {
      return errorResponse(`No trace records found for user '${userId}'`, 404);
    }

    return successResponse(analytics, "User analytics retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
