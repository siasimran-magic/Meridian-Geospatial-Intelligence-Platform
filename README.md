# Geospatial Intelligence Platform

Unified PostgreSQL/PostGIS place intelligence and MongoDB GPS movement
analytics application developed for a **DBMS Level 3 Mini-Project**.

---

## 🌟 Overview

In our two-person mini-project:
- **Person 1:** PostgreSQL + PostGIS points-of-interest (POIs) and spatial radius queries.
- **Person 2 (This Module):** MongoDB GPS trace storage, spatial indexing, aggregation pipelines, movement metrics, and interactive route dashboard.

The root Next.js application preserves both modules. PostgreSQL/PostGIS owns
accounts and place intelligence; MongoDB continues to own the
`geospatial_platform.gps_traces` collection and GPS analytics.

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
6. **Spatial Explorer & Authentication:**
   - PostGIS place search, opening-status filters, reviews, bcrypt accounts,
     signed HttpOnly sessions, and admin authorization at `/spatial`, `/login`,
     and `/register`.

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

# 3. Start PostgreSQL/PostGIS and MongoDB
docker compose up -d

# 4. Apply PostgreSQL migrations and demo data
# See docs/integration.md for the psql commands

# 5. Seed realistic Bengaluru GPS data & build indexes
npm run seed

# 6. Run automated test suite
npm test

# 7. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Use `/spatial` for
PostGIS place discovery and `/` or `/analytics` for GPS analytics.

---

## 📚 Documentation Links

- [Setup & Run Instructions (PowerShell)](./docs/SETUP.md)
- [REST API Specification](./docs/API.md)
- [DBMS Concepts & Viva Guide](./docs/DBMS_CONCEPTS.md)
- [Unified Integration Guide](./docs/integration.md)
- [Spatial API](./docs/spatial-api.md)
- [Authentication](./docs/authentication.md)
