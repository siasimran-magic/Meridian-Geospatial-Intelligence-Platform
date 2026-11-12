import { MongoClient, Db, Collection } from "mongodb";
import dns from "node:dns";
import { GPSTrace } from "@/types/gps";

// Ensure DNS SRV lookups succeed on Windows/local networks for MongoDB Atlas
if (process.env.MONGODB_URI?.startsWith("mongodb+srv://")) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {}
}

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/geospatial_platform";
const options = {
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export const DB_NAME = "geospatial_platform";
export const TRACES_COLLECTION = "gps_traces";

function getDefaultDbName(): string {
  try {
    const currentUri = process.env.MONGODB_URI || uri;
    const parsed = new URL(currentUri);
    const dbFromPath = parsed.pathname.replace(/^\//, "");
    return dbFromPath || DB_NAME;
  } catch {
    return DB_NAME;
  }
}

/**
 * Retrieves the MongoDB database instance.
 */
export async function getDatabase(dbName?: string): Promise<Db> {
  const connectedClient = await clientPromise;
  const targetDbName = dbName || getDefaultDbName();
  return connectedClient.db(targetDbName);
}

/**
 * Retrieves the typed gps_traces collection.
 */
export async function getTracesCollection(dbName?: string): Promise<Collection<GPSTrace>> {
  const db = await getDatabase(dbName);
  return db.collection<GPSTrace>(TRACES_COLLECTION);
}

/**
 * Configures MongoDB collection-level JSON Schema validation and indexes.
 * Academic note: Demonstrates both DDL (Data Definition Language) commands
 * and Query Optimization techniques through compound & geospatial indexing.
 */
export async function setupDatabaseSchemaAndIndexes(db?: Db): Promise<{
  indexesCreated: string[];
  schemaConfigured: boolean;
}> {
  const targetDb = db || (await getDatabase());
  const collections = await targetDb.listCollections({ name: TRACES_COLLECTION }).toArray();

  const collectionValidator = {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "deviceId", "points", "batteryLevel", "createdAt", "updatedAt"],
      properties: {
        userId: {
          bsonType: "string",
          description: "Must be a string and is required",
        },
        deviceId: {
          bsonType: "string",
          description: "Must be a string and is required",
        },
        batteryLevel: {
          bsonType: ["int", "double", "long"],
          minimum: 0,
          maximum: 100,
          description: "Must be a number between 0 and 100",
        },
        metadata: {
          bsonType: "object",
          description: "Optional metadata object",
        },
        points: {
          bsonType: "array",
          minItems: 1,
          description: "Array of chronologically ordered GPS points",
          items: {
            bsonType: "object",
            required: ["timestamp", "coordinates", "speed", "accuracy"],
            properties: {
              timestamp: {
                bsonType: "date",
                description: "Must be a valid BSON date",
              },
              coordinates: {
                bsonType: "array",
                minItems: 2,
                maxItems: 2,
                items: {
                  bsonType: ["double", "int"],
                },
                description: "Must be [longitude, latitude] pair",
              },
              speed: {
                bsonType: ["double", "int", "long"],
                minimum: 0,
                description: "Speed in metres per second, must be >= 0",
              },
              accuracy: {
                bsonType: ["double", "int", "long"],
                minimum: 0,
                description: "Horizontal accuracy in metres, must be >= 0",
              },
            },
          },
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
    },
  };

  let schemaConfigured = false;
  if (collections.length === 0) {
    // Collection doesn't exist yet: create with validator
    await targetDb.createCollection(TRACES_COLLECTION, {
      validator: collectionValidator,
      validationLevel: "moderate",
      validationAction: "error",
    });
    schemaConfigured = true;
  } else {
    // Collection exists: update validator
    try {
      await targetDb.command({
        collMod: TRACES_COLLECTION,
        validator: collectionValidator,
        validationLevel: "moderate",
        validationAction: "error",
      });
      schemaConfigured = true;
    } catch {
      schemaConfigured = false;
    }
  }

  const collection = targetDb.collection<GPSTrace>(TRACES_COLLECTION);

  // Define indexes:
  // 1. Compound index for filtering by user and ordering by most recent
  // 2. Compound index for filtering by device and ordering by most recent
  // 3. Time-based index for point range lookups
  // 4. Trace creation index for overview sorting & pagination
  // 5. Geospatial 2dsphere index on embedded coordinates
  const indexSpecs = [
    { key: { userId: 1, createdAt: -1 }, name: "idx_userId_createdAt" },
    { key: { deviceId: 1, createdAt: -1 }, name: "idx_deviceId_createdAt" },
    { key: { "points.timestamp": 1 }, name: "idx_points_timestamp" },
    { key: { createdAt: -1 }, name: "idx_createdAt" },
    { key: { "points.coordinates": "2dsphere" }, name: "idx_geo_coordinates" },
  ];

  const indexesCreated: string[] = [];
  for (const spec of indexSpecs) {
    try {
      const idxName = await collection.createIndex(spec.key as any, { name: spec.name });
      indexesCreated.push(idxName);
    } catch (err: any) {
      // If index already exists with different options, log or continue
      indexesCreated.push(`${spec.name} (exists)`);
    }
  }

  return { indexesCreated, schemaConfigured };
}
