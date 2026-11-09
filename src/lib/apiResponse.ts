import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(
  data: T,
  message = "Request completed successfully",
  status = 200,
  extra: Record<string, any> = {}
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      ...extra,
    },
    { status }
  );
}

export function errorResponse(
  error: string,
  status = 400,
  message = "An error occurred while processing the request"
) {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
    },
    { status }
  );
}

export function handleApiError(err: unknown) {
  console.error("API Route Error:", err);

  if (err instanceof ZodError) {
    const errorDetails = err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    return errorResponse(`Validation failed: ${errorDetails}`, 422);
  }

  if (err instanceof Error) {
    // Prevent internal database details or stack traces from leaking to client
    if (err.message.includes("ECONNREFUSED") || err.message.includes("server selection error")) {
      return errorResponse("Database connection unavailable. Please ensure MongoDB is running.", 503);
    }
    return errorResponse(err.message, 400);
  }

  return errorResponse("Internal server error", 500);
}
