import { NextRequest } from "next/server";
import { GPSTraceUpdateSchema, isValidObjectId } from "@/lib/validations/trace";
import { getTraceById, updateTrace, deleteTrace } from "@/lib/services/traceService";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/traces/[id]
 * Retrieves a single GPS trace by its ID, including all stored GPS points.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid trace ID format. Must be a 24-character hexadecimal ObjectId.", 400);
    }

    const trace = await getTraceById(id);

    if (!trace) {
      return errorResponse("GPS trace not found", 404);
    }

    return successResponse(trace, "Trace retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/traces/[id]
 * Updates permitted metadata fields (batteryLevel, deviceId, metadata) of an existing trace.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid trace ID format", 400);
    }

    const body = await request.json();
    const validatedData = GPSTraceUpdateSchema.parse(body);

    const updated = await updateTrace(id, validatedData);

    if (!updated) {
      return errorResponse("GPS trace not found or could not be updated", 404);
    }

    return successResponse(updated, "Trace metadata updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/traces/[id]
 * Deletes a GPS trace record by ID.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse("Invalid trace ID format", 400);
    }

    const deleted = await deleteTrace(id);

    if (!deleted) {
      return errorResponse("GPS trace not found or already deleted", 404);
    }

    return successResponse({ id, deleted: true }, "Trace deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
