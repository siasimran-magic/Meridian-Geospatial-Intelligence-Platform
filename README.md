# Geospatial Intelligence Platform — Person 2: GPS Analytics Module

A full-stack, MongoDB-powered GPS trace ingestion, spatial analytics, and route visualization module developed for a **DBMS Level 3 Mini-Project**.

---

## 🌟 Overview

In our two-person mini-project:
- **Person 1:** PostgreSQL + PostGIS points-of-interest (POIs) and spatial radius queries.
- **Person 2 (This Module):** MongoDB GPS trace storage, spatial indexing, aggregation pipelines, movement metrics, and interactive route dashboard.

Person 2 develops and operates independently, providing modular integration points to later overlay Person 1's PostGIS POIs on the route maps.

---

## 🚀 Key Features

1. **MongoDB Database Architecture (`geospatial_platform`):**
   - Collection: `gps_traces` with embedded chronological coordinate points.
   - Database-level BSON JSON Schema validation (`$jsonSchema`).
   - 5 specialized indexes: Compound (`userId + createdAt`, `deviceId + createdAt`), Temporal (`points.timestamp`), and Spatial (`points.coordinates: 2dsphere`).
2. **Geographic Mathematics & Aggregation Pipelines:**
   - Great-circle Haversine distance calculations computed on the sphere.
   - Trajectory durations, bounding boxes, segment velocities.
   - Multi-stage MongoDB pipelines using `$facet`, `$group`, `$project`, `$reduce`, and trigonometric operators.
3. **App Router REST APIs:**
   - Full CRUD: `GET /api/traces`, `POST /api/traces`, `GET /api/traces/[id]`, `PATCH /api/traces/[id]`, `DELETE /api/traces/[id]`.
   - Analytics endpoints: `/api/analytics/overview`, `/api/analytics/traces/[id]`, `/api/analytics/users/[userId]`, `/api/analytics/daily`, `/api/analytics/devices`, `/api/analytics/charts`.
4. **Interactive Dashboard & Route Explorer:**
   - Dynamic Leaflet route map with OpenStreetMap tiles, custom origin/destination pins, and waypoint telemetry popups.
   - Overview metric cards populated directly from MongoDB `$facet` queries.
   - Recharts visual charts for trace distances, speed comparisons, and daily trends.
   - Interactive trace upload form with live validation and preset Bengaluru demonstration routes.
5. **Academic Viva & DBMS Documentation:**
   - Theoretical breakdown in [`docs/DBMS_CONCEPTS.md`](./docs/DBMS_CONCEPTS.md).
   - Interactive viva guide and ready-to-run `mongosh` commands at `/dbms-concepts`.

---

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router) & React
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Dark geospatial theme)
- **Database:** MongoDB Community Server (v7.0+ / v8.0+)
- **Database Driver:** Official MongoDB Node.js Driver (`mongodb`)
- **Mapping:** Leaflet & OpenStreetMap
- **Charts:** Recharts
- **Validation:** Zod
- **Testing:** Vitest

---

## ⚡ Quick Start (PowerShell)

```powershell
# 1. Install dependencies
npm install

# 2. Configure environment
Copy-Item .env.example .env.local

# 3. Seed realistic Bengaluru GPS data & build indexes
npm run seed

# 4. Run automated test suite
npm test

# 5. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📚 Documentation Links

- [Setup & Run Instructions (PowerShell)](./docs/SETUP.md)
- [REST API Specification](./docs/API.md)
- [DBMS Concepts & Viva Guide](./docs/DBMS_CONCEPTS.md)
