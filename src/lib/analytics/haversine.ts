import { GPSPoint, TraceAnalyticsResult } from "@/types/gps";

const EARTH_RADIUS_METERS = 6371000; // Mean radius of Earth in metres (IUGG value)

/**
 * Calculates great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * Coordinates are formatted as [longitude, latitude] in decimal degrees.
 *
 * @param coord1 [longitude, latitude] of first point
 * @param coord2 [longitude, latitude] of second point
 * @returns Distance in metres
 */
export function calculateHaversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  // Validate range
  if (
    lat1 < -90 || lat1 > 90 ||
    lat2 < -90 || lat2 > 90 ||
    lon1 < -180 || lon1 > 180 ||
    lon2 < -180 || lon2 > 180
  ) {
    return 0;
  }

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  // Avoid precision domain issues with sqrt(1 - a)
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100;
}

/**
 * Computes complete analytics from an array of GPS points.
 */
export function computeTraceMetrics(
  traceId: string,
  userId: string,
  deviceId: string,
  batteryLevel: number,
  points: GPSPoint[]
): TraceAnalyticsResult {
  if (!points || points.length === 0) {
    return {
      traceId,
      userId,
      deviceId,
      pointsCount: 0,
      startTime: null,
      endTime: null,
      durationSeconds: 0,
      durationFormatted: "0s",
      totalDistanceMeters: 0,
      totalDistanceKm: 0,
      avgRecordedSpeedMps: 0,
      avgRecordedSpeedKmh: 0,
      calculatedAvgSpeedMps: 0,
      calculatedAvgSpeedKmh: 0,
      maxSpeedMps: 0,
      maxSpeedKmh: 0,
      batteryLevel,
      boundingBox: { minLon: 0, maxLon: 0, minLat: 0, maxLat: 0 },
      segments: [],
    };
  }

  // Ensure chronological order
  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const startTime = new Date(sortedPoints[0].timestamp);
  const endTime = new Date(sortedPoints[sortedPoints.length - 1].timestamp);
  const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

  let totalDistanceMeters = 0;
  let maxSpeedMps = 0;
  let speedSum = 0;
  let validSpeedCount = 0;

  let minLon = sortedPoints[0].coordinates[0];
  let maxLon = sortedPoints[0].coordinates[0];
  let minLat = sortedPoints[0].coordinates[1];
  let maxLat = sortedPoints[0].coordinates[1];

  const segments: TraceAnalyticsResult["segments"] = [];

  for (let i = 0; i < sortedPoints.length; i++) {
    const pt = sortedPoints[i];
    const [lon, lat] = pt.coordinates;

    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;

    if (typeof pt.speed === "number" && !isNaN(pt.speed) && pt.speed >= 0) {
      speedSum += pt.speed;
      validSpeedCount++;
      if (pt.speed > maxSpeedMps) {
        maxSpeedMps = pt.speed;
      }
    }

    if (i > 0) {
      const prevPt = sortedPoints[i - 1];
      const dist = calculateHaversineDistance(prevPt.coordinates, pt.coordinates);
      totalDistanceMeters += dist;

      const segDuration = Math.max(
        1,
        Math.floor((new Date(pt.timestamp).getTime() - new Date(prevPt.timestamp).getTime()) / 1000)
      );

      segments.push({
        fromIndex: i - 1,
        toIndex: i,
        fromCoord: prevPt.coordinates,
        toCoord: pt.coordinates,
        distanceMeters: Math.round(dist * 10) / 10,
        durationSeconds: segDuration,
        speedMps: Math.round((dist / segDuration) * 100) / 100,
      });
    }
  }

  const avgRecordedSpeedMps =
    validSpeedCount > 0 ? Math.round((speedSum / validSpeedCount) * 100) / 100 : 0;
  const avgRecordedSpeedKmh = Math.round(avgRecordedSpeedMps * 3.6 * 100) / 100;

  const calculatedAvgSpeedMps =
    durationSeconds > 0 ? Math.round((totalDistanceMeters / durationSeconds) * 100) / 100 : 0;
  const calculatedAvgSpeedKmh = Math.round(calculatedAvgSpeedMps * 3.6 * 100) / 100;

  const totalDistanceKm = Math.round((totalDistanceMeters / 1000) * 100) / 100;
  const maxSpeedKmh = Math.round(maxSpeedMps * 3.6 * 100) / 100;

  // Format duration nicely (e.g., "1h 12m 45s" or "8m 10s")
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const durationParts: string[] = [];
  if (hours > 0) durationParts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) durationParts.push(`${minutes}m`);
  durationParts.push(`${seconds}s`);

  return {
    traceId,
    userId,
    deviceId,
    pointsCount: sortedPoints.length,
    startTime,
    endTime,
    durationSeconds,
    durationFormatted: durationParts.join(" "),
    totalDistanceMeters: Math.round(totalDistanceMeters * 100) / 100,
    totalDistanceKm,
    avgRecordedSpeedMps,
    avgRecordedSpeedKmh,
    calculatedAvgSpeedMps,
    calculatedAvgSpeedKmh,
    maxSpeedMps: Math.round(maxSpeedMps * 100) / 100,
    maxSpeedKmh,
    batteryLevel,
    boundingBox: { minLon, maxLon, minLat, maxLat },
    segments,
  };
}

/**
 * MongoDB Aggregation Stage helper:
 * Builds the aggregation expression for calculating the Haversine distance
 * between consecutive elements in the `points` array.
 *
 * Demonstrates advanced MongoDB aggregation operators:
 * - $range
 * - $map
 * - $arrayElemAt
 * - $sin, $cos, $sqrt, $atan2, $pow, $degreesToRadians
 * - $reduce
 */
export function getMongoHaversineExpression() {
  const PI = Math.PI;
  const R = EARTH_RADIUS_METERS;

  return {
    $cond: {
      if: { $lt: [{ $size: "$points" }, 2] },
      then: 0,
      else: {
        $reduce: {
          input: {
            $range: [0, { $subtract: [{ $size: "$points" }, 1] }],
          },
          initialValue: 0,
          in: {
            $let: {
              vars: {
                p1: { $arrayElemAt: ["$points", "$$this"] },
                p2: { $arrayElemAt: ["$points", { $add: ["$this", 1] }] },
              },
              in: {
                $let: {
                  vars: {
                    lon1: { $arrayElemAt: ["$$p1.coordinates", 0] },
                    lat1: { $arrayElemAt: ["$$p1.coordinates", 1] },
                    lon2: { $arrayElemAt: ["$$p2.coordinates", 0] },
                    lat2: { $arrayElemAt: ["$$p2.coordinates", 1] },
                  },
                  in: {
                    $let: {
                      vars: {
                        dLat: {
                          $multiply: [
                            { $subtract: ["$$lat2", "$$lat1"] },
                            PI / 180,
                          ],
                        },
                        dLon: {
                          $multiply: [
                            { $subtract: ["$$lon2", "$$lon1"] },
                            PI / 180,
                          ],
                        },
                        lat1Rad: { $multiply: ["$$lat1", PI / 180] },
                        lat2Rad: { $multiply: ["$$lat2", PI / 180] },
                      },
                      in: {
                        $let: {
                          vars: {
                            a: {
                              $add: [
                                {
                                  $pow: [
                                    { $sin: { $divide: ["$$dLat", 2] } },
                                    2,
                                  ],
                                },
                                {
                                  $multiply: [
                                    { $cos: "$$lat1Rad" },
                                    { $cos: "$$lat2Rad" },
                                    {
                                      $pow: [
                                        { $sin: { $divide: ["$$dLon", 2] } },
                                        2,
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                          },
                          in: {
                            $add: [
                              "$$value",
                              {
                                $multiply: [
                                  R,
                                  2,
                                  {
                                    $atan2: [
                                      { $sqrt: "$$a" },
                                      {
                                        $sqrt: {
                                          $max: [0, { $subtract: [1, "$$a"] }],
                                        },
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
