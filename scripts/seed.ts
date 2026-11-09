import { MongoClient } from "mongodb";
import { setupDatabaseSchemaAndIndexes, DB_NAME, TRACES_COLLECTION } from "../src/lib/mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/geospatial_platform";

interface SeedTraceDefinition {
  userId: string;
  deviceId: string;
  tripType: string;
  routeTitle: string;
  batteryLevel: number;
  baseDate: string; // ISO date string for start
  waypoints: [number, number][]; // [lon, lat] key locations in Bengaluru
  baseSpeedMps: number; // typical speed in m/s
  speedVariation: number;
}

// Key realistic routes across Bengaluru, Karnataka
const bengaluruSeedRoutes: SeedTraceDefinition[] = [
  {
    userId: "user_001",
    deviceId: "dev_bglr_alpha",
    tripType: "food_delivery",
    routeTitle: "MG Road -> Indiranagar -> Domlur Delivery Corridor",
    batteryLevel: 88,
    baseDate: "2026-10-18T10:15:00Z",
    baseSpeedMps: 7.2, // ~26 km/h
    speedVariation: 2.5,
    waypoints: [
      [77.6080, 12.9730], // MG Road Metro
      [77.6185, 12.9742], // Trinity Circle
      [77.6290, 12.9755], // Halasuru Lake
      [77.6395, 12.9770], // Indiranagar 100ft Rd entrance
      [77.6430, 12.9705], // Indiranagar 12th Main
      [77.6380, 12.9610], // Domlur Flyover
      [77.6480, 12.9590], // EGL Inner Ring Road
    ],
  },
  {
    userId: "user_001",
    deviceId: "dev_bglr_alpha",
    tripType: "food_delivery",
    routeTitle: "Koramangala 4th Block -> BTM Layout Express",
    batteryLevel: 72,
    baseDate: "2026-10-19T13:30:00Z",
    baseSpeedMps: 6.5, // ~23 km/h
    speedVariation: 2.0,
    waypoints: [
      [77.6280, 12.9340], // Koramangala 4th Block
      [77.6210, 12.9300], // Sony World Signal
      [77.6150, 12.9230], // Madiwala Checkpost
      [77.6105, 12.9165], // BTM Water Tank
      [77.6040, 12.9120], // BTM 2nd Stage Udupi Garden
    ],
  },
  {
    userId: "user_002",
    deviceId: "dev_bglr_beta",
    tripType: "commute",
    routeTitle: "Hebbal Flyover -> Manyata Tech Park Morning Commute",
    batteryLevel: 95,
    baseDate: "2026-10-19T08:45:00Z",
    baseSpeedMps: 11.0, // ~40 km/h
    speedVariation: 4.0,
    waypoints: [
      [77.5920, 13.0380], // Hebbal Outer Ring Rd
      [77.6050, 13.0440], // Nagawara Junction
      [77.6200, 13.0480], // Manyata Tech Park Gate 1
      [77.6240, 13.0510], // Manyata Tech Park Block G
    ],
  },
  {
    userId: "user_002",
    deviceId: "dev_bglr_beta",
    tripType: "commute",
    routeTitle: "Manyata -> Outer Ring Road -> Kalyan Nagar Return",
    batteryLevel: 64,
    baseDate: "2026-10-20T17:50:00Z",
    baseSpeedMps: 8.5, // ~30 km/h
    speedVariation: 3.0,
    waypoints: [
      [77.6240, 13.0510], // Manyata
      [77.6320, 13.0400], // Hennur Cross
      [77.6400, 13.0300], // HRBR Layout
      [77.6450, 13.0230], // Kalyan Nagar 80ft Road
    ],
  },
  {
    userId: "user_003",
    deviceId: "dev_bglr_gamma",
    tripType: "security_patrol",
    routeTitle: "Electronic City Phase 1 Perimeter Patrol",
    batteryLevel: 55,
    baseDate: "2026-10-20T14:10:00Z",
    baseSpeedMps: 5.0, // ~18 km/h patrol
    speedVariation: 1.5,
    waypoints: [
      [77.6650, 12.8450], // Toll Gate
      [77.6710, 12.8420], // Infosys Gate 1
      [77.6780, 12.8400], // Wipro Avenue
      [77.6830, 12.8460], // HP Avenue
      [77.6750, 12.8520], // Velankani Tech Park
      [77.6680, 12.8490], // Phase 1 Main Road
    ],
  },
  {
    userId: "user_003",
    deviceId: "dev_bglr_gamma",
    tripType: "security_patrol",
    routeTitle: "Electronic City Phase 2 Surveillance Loop",
    batteryLevel: 42,
    baseDate: "2026-10-21T02:15:00Z",
    baseSpeedMps: 4.8,
    speedVariation: 1.0,
    waypoints: [
      [77.6850, 12.8450], // Phase 2 East Entrance
      [77.6920, 12.8430], // TCS campus perimeter
      [77.6980, 12.8390], // Tech Mahindra gate
      [77.6930, 12.8350], // Fruit Market road
      [77.6860, 12.8380], // Phase 2 Circle
    ],
  },
  {
    userId: "user_004",
    deviceId: "dev_bglr_delta",
    tripType: "courier_dispatch",
    routeTitle: "Malleshwaram 8th Cross -> Rajajinagar 1st Block Dispatch",
    batteryLevel: 80,
    baseDate: "2026-10-21T11:00:00Z",
    baseSpeedMps: 6.0,
    speedVariation: 2.2,
    waypoints: [
      [77.5710, 13.0030], // Malleshwaram 8th Cross
      [77.5650, 12.9980], // Margosa Road
      [77.5580, 12.9920], // Navrang Circle
      [77.5530, 12.9860], // Rajajinagar Metro
      [77.5480, 12.9810], // Rajajinagar 1st Block
    ],
  },
  {
    userId: "user_005",
    deviceId: "dev_bglr_alpha",
    tripType: "infrastructure_inspection",
    routeTitle: "Whitefield ITPL -> Hope Farm -> Kadugodi Survey",
    batteryLevel: 91,
    baseDate: "2026-10-22T09:15:00Z",
    baseSpeedMps: 9.0,
    speedVariation: 3.5,
    waypoints: [
      [77.7470, 12.9850], // ITPL Main Gate
      [77.7540, 12.9840], // Pattandur Agrahara
      [77.7610, 12.9830], // Hope Farm Junction
      [77.7670, 12.9910], // Kadugodi Tree Park
      [77.7720, 12.9980], // Kadugodi Metro Station
    ],
  },
];

/**
 * Interpolates smooth sub-points along a series of geographic waypoints
 * to simulate authentic GPS sampling intervals (every 10-30 seconds).
 */
function interpolateRoute(
  waypoints: [number, number][],
  startTime: Date,
  baseSpeed: number,
  speedVariation: number
) {
  const points: {
    timestamp: Date;
    coordinates: [number, number];
    speed: number;
    accuracy: number;
  }[] = [];

  let currentTimeMs = startTime.getTime();

  for (let i = 0; i < waypoints.length - 1; i++) {
    const startCoord = waypoints[i];
    const endCoord = waypoints[i + 1];

    // Number of interpolated GPS samples between each pair of waypoints
    const steps = 6 + Math.floor(Math.random() * 4); // 6 to 9 samples per segment

    for (let s = 0; s < steps; s++) {
      const fraction = s / steps;
      // Slight GPS jitter to simulate authentic sensor drift (+- 0.00015 deg ~ 15m)
      const jitterLon = (Math.random() - 0.5) * 0.00015;
      const jitterLat = (Math.random() - 0.5) * 0.00015;

      const lon = Number((startCoord[0] + (endCoord[0] - startCoord[0]) * fraction + jitterLon).toFixed(6));
      const lat = Number((startCoord[1] + (endCoord[1] - startCoord[1]) * fraction + jitterLat).toFixed(6));

      // Speed with realistic variation around the base speed
      const speed = Number(
        Math.max(1.0, baseSpeed + (Math.random() * 2 - 1) * speedVariation).toFixed(2)
      );

      // GPS horizontal accuracy (metres)
      const accuracy = Number((4.0 + Math.random() * 5.0).toFixed(1));

      points.push({
        timestamp: new Date(currentTimeMs),
        coordinates: [lon, lat],
        speed,
        accuracy,
      });

      // Sample interval between 15 and 30 seconds
      currentTimeMs += 15000 + Math.floor(Math.random() * 15000);
    }
  }

  // Include final destination point
  const lastWaypoint = waypoints[waypoints.length - 1];
  points.push({
    timestamp: new Date(currentTimeMs + 20000),
    coordinates: [lastWaypoint[0], lastWaypoint[1]],
    speed: Number(Math.max(0.5, baseSpeed * 0.5).toFixed(2)),
    accuracy: 4.8,
  });

  return points;
}

export async function seedDatabase() {
  console.log("=================================================");
  console.log("   GEOSPATIAL PLATFORM: GPS TRACE SEED SCRIPT   ");
  console.log("=================================================");
  console.log(`Target MongoDB URI: ${uri}`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log("\n[1/3] Configuring MongoDB JSON Schema validation & indexes...");
  const { indexesCreated, schemaConfigured } = await setupDatabaseSchemaAndIndexes(db);
  console.log(`Schema validation active: ${schemaConfigured}`);
  console.log(`Indexes ready:`, indexesCreated);

  console.log("\n[2/3] Checking for existing synthetic seed records...");
  const collection = db.collection(TRACES_COLLECTION);

  // Clear existing synthetic traces so running seed repeatedly is idempotent
  const deleteResult = await collection.deleteMany({
    "metadata.isSyntheticSeed": true,
  });
  console.log(`Removed ${deleteResult.deletedCount} previous synthetic demonstration traces.`);

  console.log("\n[3/3] Generating realistic Bengaluru GPS trajectories...");
  const documentsToInsert = bengaluruSeedRoutes.map((def) => {
    const startDate = new Date(def.baseDate);
    const points = interpolateRoute(
      def.waypoints,
      startDate,
      def.baseSpeedMps,
      def.speedVariation
    );

    const createdAt = startDate;
    const updatedAt = points[points.length - 1].timestamp;

    return {
      userId: def.userId,
      deviceId: def.deviceId,
      points,
      batteryLevel: def.batteryLevel,
      metadata: {
        isSyntheticSeed: true,
        tripType: def.tripType,
        routeTitle: def.routeTitle,
        notes: "Synthetic demonstration trace generated for DBMS Level 3 Mini-Project evaluation (Bengaluru, Karnataka).",
      },
      createdAt,
      updatedAt,
    };
  });

  const insertResult = await collection.insertMany(documentsToInsert);
  console.log(`Successfully seeded ${insertResult.insertedCount} GPS traces into '${TRACES_COLLECTION}' collection!`);

  const totalPoints = documentsToInsert.reduce((sum, d) => sum + d.points.length, 0);
  console.log(`Total generated GPS points: ${totalPoints}`);
  console.log("\nSeeded Traces Breakdown:");
  documentsToInsert.forEach((d, i) => {
    console.log(
      `  [#${i + 1}] User: ${d.userId.padEnd(9)} | Device: ${d.deviceId.padEnd(14)} | Points: ${String(
        d.points.length
      ).padStart(2)} | Type: ${d.metadata.tripType.padEnd(25)} | ${d.metadata.routeTitle}`
    );
  });

  console.log("\nSeed completed successfully.");
  await client.close();
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed with error:", err);
      process.exit(1);
    });
}
