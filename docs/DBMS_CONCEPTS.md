# DBMS Concepts & Theoretical Architecture — Person 2: MongoDB GPS Module

**Project Title:** Geospatial Intelligence Platform  
**Academic Module:** Person 2 — GPS Trace Ingestion, Spatial Indexing & Movement Analytics  
**Database Engine:** MongoDB Community Server (v7.0+ / v8.0+)  
**Application Framework:** Next.js (App Router), TypeScript  

---

## 1. Why MongoDB is Suitable for Timestamped GPS Traces

In mobile and IoT tracking domains, GPS receivers stream high-frequency geographic samples (longitude, latitude, altitude, speed, bearing, accuracy) at 1 to 5 second intervals.

### The Problem with Pure Relational Storage for GPS Streams
In a strictly normalized relational model (3NF):
- Each individual GPS point is saved as a discrete table row with a foreign key referencing a `trips` table.
- A 45-minute delivery route produces ~1,800 separate rows. With 1,000 active vehicles, this generates ~1.8 million row inserts every 45 minutes.
- When querying a route to render a map polyline, the database must execute a large multi-row `SELECT ... WHERE trip_id = ? ORDER BY timestamp ASC` or an expensive `JOIN`.
- B-tree index maintenance for millions of timestamped rows causes massive write amplification and I/O bottlenecks.

### The MongoDB Document Advantage
1. **Hierarchical Trajectory Locality:** A single journey is encapsulated within a parent document containing an embedded array of points (`points: [ { timestamp, coordinates, speed, accuracy } ]`).
2. **Atomic Ingestion:** An entire route or route chunk is inserted in a single atomic write operation (`insertOne`).
3. **Sequential Read Performance:** Fetching a route retrieves all waypoints already grouped and pre-sorted in contiguous memory/disk storage. Zero multi-table JOINs are required.
4. **Polymorphic Telemetry:** As IoT hardware changes (e.g., adding gyroscope, tire pressure, or temperature sensors), the schema accommodates new fields in `metadata` without costly table alterations (`ALTER TABLE`).

---

## 2. Document Schema & Embedded GPS Points

The collection `gps_traces` within the `geospatial_platform` database follows this BSON structure:

```json
{
  "_id": ObjectId("6717a1f59c8b7c2a104e1234"),
  "userId": "user_001",
  "deviceId": "dev_bglr_alpha",
  "points": [
    {
      "timestamp": ISODate("2026-10-22T09:00:00.000Z"),
      "coordinates": [77.6080, 12.9730],
      "speed": 7.2,
      "accuracy": 5.4
    },
    {
      "timestamp": ISODate("2026-10-22T09:00:20.000Z"),
      "coordinates": [77.6185, 12.9742],
      "speed": 8.1,
      "accuracy": 4.8
    }
  ],
  "batteryLevel": 88,
  "metadata": {
    "tripType": "food_delivery",
    "routeTitle": "MG Road -> Indiranagar -> Domlur Delivery Corridor",
    "isSyntheticSeed": true
  },
  "createdAt": ISODate("2026-10-22T09:00:00.000Z"),
  "updatedAt": ISODate("2026-10-22T09:25:00.000Z")
}
```

### Conventions & Constraints:
- **Coordinate Order:** `[longitude, latitude]` conforming to GeoJSON and MongoDB spatial standards (-180 &le; lon &le; 180, -90 &le; lat &le; 90).
- **Speed Unit:** Metres per second (`m/s`) in database storage; converted to kilometres per hour (`km/h`) on presentation (`km/h = m/s * 3.6`).
- **Timestamps:** Real BSON `Date` objects (`ISODate`), allowing index range queries and temporal aggregation operators (`$dateToString`, `$year`, `$month`).

---

## 3. Trade-offs: Embedded Points vs Normalized Collections

| Metric / Feature | Embedded Array (`points: []`) [Selected] | Separate Point Collection (`points` table/coll) |
| :--- | :--- | :--- |
| **Write Throughput** | High (1 write per trace upload) | Low (N writes per point) |
| **Read Latency (Route Map)** | Single seek (< 5ms) | Index scan + sort + join (> 50ms) |
| **Document Size Limit** | Subject to MongoDB 16MB BSON limit (~150,000 points per document) | Unlimited points per trip |
| **Point-Level Updates** | Complex positional updates (`$push`, `$[<identifier>]`) | Simple single-record update |
| **Suitability** | Ideal for trips up to a few thousand points | Suitable for continuous multi-month stationary sensors |

*Design Decision:* A typical urban journey comprises 50 to 2,000 GPS samples (~20KB to 200KB), well below MongoDB's 16MB document limit. Embedding optimizes read speed for map visualization and batch write efficiency.

---

## 4. Collection-Level Schema Validation (`$jsonSchema`)

To prevent corrupt or malformed data at the database engine level (independent of application code), collection validation is enforced via MongoDB DDL:

```javascript
db.runCommand({
  collMod: "gps_traces",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "deviceId", "points", "batteryLevel", "createdAt", "updatedAt"],
      properties: {
        userId: { bsonType: "string" },
        deviceId: { bsonType: "string" },
        batteryLevel: {
          bsonType: ["int", "double", "long"],
          minimum: 0,
          maximum: 100
        },
        points: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["timestamp", "coordinates", "speed", "accuracy"],
            properties: {
              timestamp: { bsonType: "date" },
              coordinates: {
                bsonType: "array",
                minItems: 2,
                maxItems: 2,
                items: { bsonType: ["double", "int"] }
              },
              speed: { bsonType: ["double", "int", "long"], minimum: 0 },
              accuracy: { bsonType: ["double", "int", "long"], minimum: 0 }
            }
          }
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
});
```

---

## 5. Indexing Strategy & Query Optimization

Without indexes, queries trigger collection scans (`COLLSCAN`), reading all documents from disk. Five specialized indexes are established:

1. **Compound User-Date Index:**  
   `{ userId: 1, createdAt: -1 }`  
   *Use Case:* Fast user trace history lookup sorted from newest to oldest without in-memory sorting.
2. **Compound Device-Date Index:**  
   `{ deviceId: 1, createdAt: -1 }`  
   *Use Case:* Hardware telemetry monitoring and device activity segregation.
3. **Temporal Point Index (Multikey):**  
   `{ "points.timestamp": 1 }`  
   *Use Case:* Allows time-bounded point searches across all traces.
4. **Trace Creation Index:**  
   `{ createdAt: -1 }`  
   *Use Case:* Global overview pagination and sorting by most recent activity.
5. **Geospatial 2dsphere Index:**  
   `{ "points.coordinates": "2dsphere" }`  
   *Use Case:* Spatial queries (`$geoWithin`, `$nearSphere`, `$geoIntersects`) on the Earth's spherical surface.

### Verifying Index Usage via `explain()`:
```javascript
db.gps_traces.find({ userId: "user_001" }).sort({ createdAt: -1 }).explain("executionStats");
```
*Expected Execution Stage:* `IXSCAN` (Index Scan) &rarr; `FETCH` (no `SORT` stage, proving the compound index satisfied both filter and order).

---

## 6. Distance & Duration Mathematics

### Great-Circle Distance (Haversine Formula)
Because Earth is spherical, linear Euclidean distance ($d = \sqrt{\Delta x^2 + \Delta y^2}$) causes severe geographic errors. The platform uses the Haversine equation ($R = 6,371,000 \text{ m}$):

$$\Delta\phi = (\text{lat}_2 - \text{lat}_1) \times \frac{\pi}{180}$$
$$\Delta\lambda = (\text{lon}_2 - \text{lon}_1) \times \frac{\pi}{180}$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\text{lat}_1 \times \frac{\pi}{180}) \cdot \cos(\text{lat}_2 \times \frac{\pi}{180}) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c$$

### Route Duration
$$\text{Duration} = \max(0, \text{latestTimestamp} - \text{earliestTimestamp})$$

### Speed Definitions:
- **Recorded Speed ($v_{\text{rec}}$):** The mathematical mean of instantaneous Doppler-derived speed readings reported by the GPS receiver hardware:
  $$v_{\text{rec}} = \frac{1}{N} \sum_{i=1}^N \text{speed}_i$$
- **Calculated Average Speed ($v_{\text{calc}}$):** The overall trajectory length divided by total elapsed movement duration:
  $$v_{\text{calc}} = \frac{\sum d_{\text{segments}}}{\Delta t_{\text{total}}}$$

---

## 7. MongoDB Aggregation Pipelines

Rather than pulling all raw records into the Node.js application, data transformations are executed within MongoDB's native C++ aggregation engine.

### Pipeline 1: Platform Overview ($facet Pipeline)
```javascript
db.gps_traces.aggregate([
  {
    $facet: {
      summary: [
        {
          $project: {
            userId: 1,
            deviceId: 1,
            pointsCount: { $size: { $ifNull: ["$points", []] } },
            avgSpeed: { $avg: "$points.speed" },
            maxSpeed: { $max: "$points.speed" }
          }
        },
        {
          $group: {
            _id: null,
            totalTraces: { $sum: 1 },
            totalPoints: { $sum: "$pointsCount" },
            overallAvgSpeedMps: { $avg: "$avgSpeed" },
            overallMaxSpeedMps: { $max: "$maxSpeed" },
            users: { $addToSet: "$userId" },
            devices: { $addToSet: "$deviceId" }
          }
        }
      ],
      latest: [
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        { $project: { userId: 1, deviceId: 1, createdAt: 1 } }
      ]
    }
  }
]);
```

### Pipeline 2: User Movement Summary
```javascript
db.gps_traces.aggregate([
  { $match: { userId: "user_001" } },
  {
    $group: {
      _id: "$userId",
      tracesCount: { $sum: 1 },
      totalPoints: { $sum: { $size: "$points" } },
      avgSpeedMps: { $avg: { $avg: "$points.speed" } },
      maxSpeedMps: { $max: { $max: "$points.speed" } },
      devices: { $addToSet: "$deviceId" },
      firstActive: { $min: "$createdAt" },
      lastActive: { $max: "$createdAt" }
    }
  }
]);
```

---

## 8. Limitations of Synthetic GPS Data

1. **Multipath Reflection & Urban Canyons:** Real GPS in dense cities like Bengaluru suffers from satellite signal bounce off skyscrapers, producing occasional 50m jumps. Synthetic interpolation generates smoother curves.
2. **Doppler Sensor Drift:** Real GPS chips estimate speed using satellite Doppler shift, occasionally reporting non-zero speeds while stationary at traffic lights.
3. **Tunnel & Underpass Signal Loss:** Real tracks experience multi-minute data voids when entering flyover underpasses or parking basements.

---

## 9. Integration Contract with Person 1 (PostgreSQL / PostGIS)

In the complete system:
- **Person 2 (MongoDB):** Captures high-frequency GPS coordinate streams, computes route metrics, and renders the route polyline.
- **Person 1 (PostgreSQL / PostGIS):** Manages a relational database of Points of Interest (POIs) such as restaurants, landmarks, and EV charging stations with `GEOMETRY(Point, 4326)` columns.

### Integration Protocol:
1. Person 2 obtains the selected route's bounding box or waypoint line:  
   `[ [lon1, lat1], [lon2, lat2], ... ]`
2. Person 2 calls Person 1's PostGIS API endpoint:  
   `GET /api/pois/nearby?corridor=LINESTRING(...)&bufferMeters=500`
3. Person 1 executes PostGIS spatial query:  
   ```sql
   SELECT id, name, category, ST_AsGeoJSON(geom)
   FROM pois
   WHERE ST_DWithin(geom::geography, ST_GeomFromGeoJSON($1)::geography, 500);
   ```
4. Person 2's Leaflet map receives the POI JSON array and overlays restaurant pins alongside the GPS route.
