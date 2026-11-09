import { z } from "zod";

// Longitude: -180 to 180, Latitude: -90 to 90
export const CoordinatesSchema = z
  .tuple([
    z
      .number()
      .min(-180, "Longitude must be >= -180")
      .max(180, "Longitude must be <= 180"),
    z
      .number()
      .min(-90, "Latitude must be >= -90")
      .max(90, "Latitude must be <= 90"),
  ])
  .refine((coords) => coords.length === 2, {
    message: "Coordinates must be a [longitude, latitude] pair",
  });

export const GPSPointSchema = z.object({
  timestamp: z
    .union([z.string().datetime({ message: "Invalid ISO timestamp" }), z.date()])
    .transform((val) => (typeof val === "string" ? new Date(val) : val)),
  coordinates: CoordinatesSchema,
  speed: z
    .number()
    .min(0, "Speed must be non-negative (>= 0 m/s)")
    .max(150, "Speed exceeds realistic terrestrial limit (max 150 m/s)"),
  accuracy: z
    .number()
    .min(0, "Accuracy must be >= 0 metres")
    .max(1000, "Accuracy exceeds realistic threshold (max 1000m)"),
});

export const GPSTraceCreateSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(2, "userId must be at least 2 characters")
    .max(64, "userId cannot exceed 64 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "userId contains invalid characters"),
  deviceId: z
    .string()
    .trim()
    .min(2, "deviceId must be at least 2 characters")
    .max(64, "deviceId cannot exceed 64 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "deviceId contains invalid characters"),
  batteryLevel: z
    .number()
    .min(0, "Battery level cannot be less than 0%")
    .max(100, "Battery level cannot exceed 100%"),
  metadata: z
    .object({
      tripType: z.string().max(50).optional(),
      notes: z.string().max(500).optional(),
      routeTitle: z.string().max(100).optional(),
      isSyntheticSeed: z.boolean().optional(),
    })
    .optional(),
  points: z
    .array(GPSPointSchema)
    .min(2, "Trace must have at least 2 GPS points to compute trajectory")
    .max(5000, "Trace cannot exceed 5000 GPS points per upload"),
});

export const GPSTraceUpdateSchema = z
  .object({
    batteryLevel: z.number().min(0).max(100).optional(),
    deviceId: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    metadata: z
      .object({
        tripType: z.string().max(50).optional(),
        notes: z.string().max(500).optional(),
        routeTitle: z.string().max(100).optional(),
        isSyntheticSeed: z.boolean().optional(),
      })
      .optional(),
  })
  .strict();

export const TraceFilterSchema = z.object({
  userId: z.string().trim().optional(),
  deviceId: z.string().trim().optional(),
  startDate: z.string().datetime({ message: "Invalid startDate format" }).optional(),
  endDate: z.string().datetime({ message: "Invalid endDate format" }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "pointsCount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
