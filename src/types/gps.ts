import { ObjectId } from "mongodb";

export interface GPSPoint {
  timestamp: Date;
  coordinates: [number, number]; // [longitude, latitude] in decimal degrees
  speed: number; // in metres per second (m/s)
  accuracy: number; // horizontal accuracy in metres
}

export interface GPSTrace {
  _id?: ObjectId | string;
  userId: string;
  deviceId: string;
  points: GPSPoint[];
  batteryLevel: number; // 0 - 100 percentage
  metadata?: {
    tripType?: string; // e.g., 'commute', 'delivery', 'patrol', 'inspection'
    notes?: string;
    routeTitle?: string;
    isSyntheticSeed?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GPSTraceInput {
  userId: string;
  deviceId: string;
  points: {
    timestamp: string | Date;
    coordinates: [number, number];
    speed: number;
    accuracy: number;
  }[];
  batteryLevel: number;
  metadata?: {
    tripType?: string;
    notes?: string;
  };
}

export interface GPSTraceUpdateInput {
  batteryLevel?: number;
  deviceId?: string;
  metadata?: {
    tripType?: string;
    notes?: string;
  };
}

export interface TraceFilterQuery {
  userId?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "pointsCount";
  sortOrder?: "asc" | "desc";
}

export interface TraceSummaryItem {
  id: string;
  userId: string;
  deviceId: string;
  pointsCount: number;
  startTime: Date | null;
  endTime: Date | null;
  durationSeconds: number;
  totalDistanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  batteryLevel: number;
  tripType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TraceAnalyticsResult {
  traceId: string;
  userId: string;
  deviceId: string;
  pointsCount: number;
  startTime: Date | null;
  endTime: Date | null;
  durationSeconds: number;
  durationFormatted: string;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  avgRecordedSpeedMps: number;
  avgRecordedSpeedKmh: number;
  calculatedAvgSpeedMps: number;
  calculatedAvgSpeedKmh: number;
  maxSpeedMps: number;
  maxSpeedKmh: number;
  batteryLevel: number;
  boundingBox: {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
  };
  segments: {
    fromIndex: number;
    toIndex: number;
    fromCoord: [number, number];
    toCoord: [number, number];
    distanceMeters: number;
    durationSeconds: number;
    speedMps: number;
  }[];
}

export interface OverviewAnalytics {
  totalTraces: number;
  totalPoints: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  overallAvgSpeedMps: number;
  overallAvgSpeedKmh: number;
  overallMaxSpeedMps: number;
  overallMaxSpeedKmh: number;
  uniqueUsersCount: number;
  uniqueDevicesCount: number;
  latestTrace: {
    id: string;
    userId: string;
    deviceId: string;
    createdAt: Date;
    pointsCount: number;
  } | null;
}

export interface UserAnalytics {
  userId: string;
  tracesCount: number;
  totalPoints: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  avgSpeedMps: number;
  avgSpeedKmh: number;
  maxSpeedMps: number;
  devices: string[];
  firstActive: Date | null;
  lastActive: Date | null;
}

export interface DailyActivityItem {
  date: string; // YYYY-MM-DD
  traceCount: number;
  totalPoints: number;
  totalDistanceKm: number;
  avgSpeedKmh: number;
  activeUsers: number;
}

export interface DeviceActivityItem {
  deviceId: string;
  traceCount: number;
  totalPoints: number;
  totalDistanceKm: number;
  avgSpeedKmh: number;
  users: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}
