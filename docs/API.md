# GPS Analytics Module — REST API Specification

All routes return standard JSON envelopes:
```json
{
  "success": true,
  "data": { ... },
  "message": "Description",
  "pagination": { ... } // optional
}
```

---

## 1. Trace Operations

### `GET /api/traces`
Retrieves a paginated list of GPS traces with summary metrics.

**Query Parameters:**
- `userId` *(string, optional)* — Filter by user ID.
- `deviceId` *(string, optional)* — Filter by device ID.
- `startDate` *(ISO Date string, optional)* — Minimum creation date.
- `endDate` *(ISO Date string, optional)* — Maximum creation date.
- `page` *(number, default: 1)* — Page number.
- `limit` *(number, default: 10, max: 100)* — Page size.
- `sortBy` *(string, default: "createdAt")* — Sort field (`createdAt` | `pointsCount`).
- `sortOrder` *(string, default: "desc")* — Sort order (`asc` | `desc`).

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "6717a1f59c8b7c2a104e1234",
      "userId": "user_001",
      "deviceId": "dev_bglr_alpha",
      "pointsCount": 42,
      "startTime": "2026-10-18T10:15:00.000Z",
      "endTime": "2026-10-18T10:29:40.000Z",
      "durationSeconds": 880,
      "totalDistanceMeters": 6420.5,
      "avgSpeedMps": 7.3,
      "maxSpeedMps": 9.8,
      "batteryLevel": 88,
      "tripType": "food_delivery",
      "createdAt": "2026-10-18T10:15:00.000Z",
      "updatedAt": "2026-10-18T10:29:40.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "totalPages": 1
  }
}
```

---

### `POST /api/traces`
Creates a new GPS trace with embedded waypoints.

**Request Body:**
```json
{
  "userId": "user_001",
  "deviceId": "dev_bglr_alpha",
  "batteryLevel": 85,
  "metadata": {
    "tripType": "delivery",
    "notes": "Electronic City route"
  },
  "points": [
    {
      "timestamp": "2026-10-22T09:00:00Z",
      "coordinates": [77.6080, 12.9730],
      "speed": 6.5,
      "accuracy": 5.0
    },
    {
      "timestamp": "2026-10-22T09:01:00Z",
      "coordinates": [77.6185, 12.9742],
      "speed": 7.8,
      "accuracy": 4.8
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "6717a1f59c8b7c2a104e1235",
    "userId": "user_001",
    "deviceId": "dev_bglr_alpha",
    "pointsCount": 2,
    "batteryLevel": 85,
    "createdAt": "2026-10-22T09:00:00.000Z"
  },
  "message": "GPS trace created successfully"
}
```

---

### `GET /api/traces/[id]`
Retrieves full details of a specific trace, including all stored coordinates.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6717a1f59c8b7c2a104e1234",
    "userId": "user_001",
    "deviceId": "dev_bglr_alpha",
    "points": [ ... ],
    "batteryLevel": 88,
    "metadata": { ... },
    "createdAt": "2026-10-18T10:15:00.000Z",
    "updatedAt": "2026-10-18T10:29:40.000Z"
  }
}
```

---

### `PATCH /api/traces/[id]`
Updates permitted metadata fields (battery level, deviceId, metadata). Raw GPS coordinates and user IDs cannot be altered via PATCH.

**Request Body:**
```json
{
  "batteryLevel": 90,
  "metadata": {
    "notes": "Route inspected and verified"
  }
}
```

---

### `DELETE /api/traces/[id]`
Permanently deletes a GPS trace by its MongoDB ObjectId.

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "id": "6717a1f59c8b7c2a104e1234", "deleted": true },
  "message": "Trace deleted successfully"
}
```

---

## 2. Analytics Operations

### `GET /api/analytics/overview`
Platform-wide movement metrics calculated via MongoDB `$facet` aggregation.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalTraces": 8,
    "totalPoints": 258,
    "totalDistanceMeters": 48230.12,
    "totalDistanceKm": 48.23,
    "overallAvgSpeedMps": 7.4,
    "overallAvgSpeedKmh": 26.64,
    "overallMaxSpeedMps": 14.5,
    "overallMaxSpeedKmh": 52.2,
    "uniqueUsersCount": 5,
    "uniqueDevicesCount": 4,
    "latestTrace": {
      "id": "6717a1f59c8b7c2a104e1238",
      "userId": "user_005",
      "deviceId": "dev_bglr_alpha",
      "createdAt": "2026-10-22T09:15:00.000Z",
      "pointsCount": 32
    }
  }
}
```

---

### `GET /api/analytics/traces/[id]`
Calculates duration, Haversine distance, speed distributions, and segment metrics for a single trace.

---

### `GET /api/analytics/users/[userId]`
Aggregates activity across all traces for a specified user (`$match + $group`).

---

### `GET /api/analytics/daily`
Returns chronological daily movement summaries (date, traces, distance in km, average speed, active users).

---

### `GET /api/analytics/devices`
Returns activity and user associations grouped by device hardware identifier.

---

### `GET /api/analytics/charts`
Returns recent trace comparison values (distance and speed) formatted for front-end charts.
