# Meridian — Geospatial Intelligence Platform

A full-stack geospatial application combining **GPS movement analytics** with **point-of-interest (POI) search**. Meridian stores geographic data, supports location-based queries, analyses GPS traces and presents results through an interactive dashboard.

> **Project type:** DBMS Level 3 Mini-Project  
> **Application:** Next.js web application  
> **Databases:** PostgreSQL + PostGIS and MongoDB  
> **Repository:** https://github.com/siasimran-magic/Meridian-Geospatial-Intelligence-Platform

---

## 1. Project Overview

Geographic information is useful only when an application can do more than store latitude and longitude values. A geospatial application should be able to search for nearby places, measure geographic distances, analyse movement over time, and present geographic results in a form that users can understand.

Meridian addresses this by bringing two related capabilities into one application:

1. **Place intelligence:** Stores and searches points of interest (such as hospitals, restaurants, landmarks and other places), including their categories, coordinates, opening hours and associated reviews.
2. **GPS movement intelligence:** Stores GPS traces made up of timestamped coordinate readings and derives journey information such as distance, duration, speed and activity summaries.

The application exposes these capabilities through a Next.js interface with interactive maps, trace-management screens, analytics charts and spatial search.

### Example use cases

- Find places within a specified radius of a latitude/longitude coordinate.
- Filter nearby places by category, rating or opening status where supported by the spatial API.
- Upload and manage a GPS trace containing multiple timestamped location readings.
- View a recorded trace as a route on an interactive map.
- Calculate the distance travelled, elapsed duration, average and maximum recorded speed.
- Compare movement activity across users, devices and dates.
- Explore place information and geographic movement through one web application.

The bundled GPS examples are **synthetic demonstration data based on Bengaluru routes**. They are generated for development and demonstration; they are not live vehicle tracking data.

---

## 2. System Architecture

Meridian uses a Next.js application connected to PostgreSQL/PostGIS and MongoDB. The frontend communicates with both databases through Next.js API routes.

```text
             USER / BROWSER
                    |
                    v
          NEXT.JS + REACT FRONTEND
          Maps | Dashboards | Charts
                    |
                    v
          NEXT.JS API ROUTE HANDLERS
             Validation and logic
                 /       \
                v         v
       POSTGRESQL       MONGODB
       + POSTGIS        GPS traces
       Places, users    Trace documents
       and reviews      and GPS points
                \       /
                 v     v
           DATABASE RESULTS
                    |
                    v
          MAPS, TABLES AND CHARTS
```

- **PostgreSQL with PostGIS** stores structured application data such as users, places, categories, reviews and check-ins, and supports geographic searches.
- **MongoDB** stores GPS traces as documents containing metadata and timestamped coordinate points. It supports trace retrieval and aggregation-based analytics.
- **Next.js API routes** validate requests, apply application logic and communicate with the databases. The frontend presents the results through maps, tables and charts.

The databases serve different data models: PostgreSQL handles relational records and place searches, while MongoDB handles GPS trace documents and movement analytics.

---

## 3. Main Features

### 3.1 GPS trace management

- Create/upload a GPS trace with user, device, battery and metadata fields.
- Store multiple timestamped GPS points within one trace document.
- Retrieve traces by identifier.
- List traces with filters, sorting and pagination.
- Update permitted trace metadata.
- Delete a trace.
- Validate incoming trace payloads before storage.

### 3.2 GPS analytics

- Calculate great-circle distance between consecutive coordinates using the Haversine formula.
- Derive total trace distance and elapsed duration.
- Report average and maximum recorded speed.
- Calculate segment-level movement metrics and geographic bounds.
- Aggregate activity by user, device and day.
- Generate overview metrics for the dashboard.

Haversine distance is the straight-line great-circle distance between consecutive GPS readings. It is not a road-network distance and does not reconstruct the route actually driven between readings.

### 3.3 Place intelligence and spatial search

- Store places with geographic coordinates and descriptive information.
- Organise places using categories and category hierarchies.
- Associate places with opening-hours schedules.
- Store reviews, ratings and check-ins.
- Search for nearby places using PostGIS geographic operations.
- Use spatial and relational filters in the place discovery API.

### 3.4 Authentication and authorization

- Register and log in using email and password.
- Hash passwords with `bcryptjs` before storage.
- Maintain signed, HttpOnly session cookies.
- Store sessions in PostgreSQL, with a MongoDB fallback path in the current implementation.
- Support `user` and `admin` roles.
- Protect the administrative overview endpoint with an admin-role check.

### 3.5 Interactive interface

- Overview dashboard with movement metrics.
- GPS trace listing and trace details.
- Interactive route maps using Leaflet and OpenStreetMap tiles.
- Analytics charts using Recharts.
- Spatial place explorer.
- Login and registration pages.
- DBMS concepts and viva reference page.

---

## 4. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend framework | Next.js App Router | Pages, routing and server-side API handlers |
| UI library | React | Interactive interface components |
| Language | TypeScript | Typed application logic |
| Styling | Tailwind CSS | Application styling |
| Relational database | PostgreSQL 16 | Structured relational data |
| Geospatial extension | PostGIS | Geographic types and spatial queries |
| Vector extension | pgvector | Vector column and index infrastructure |
| NoSQL database | MongoDB 8 | GPS trace documents |
| MongoDB driver | Official MongoDB Node.js driver | MongoDB access |
| Maps | Leaflet, React Leaflet, OpenStreetMap | Geographic visualisation |
| Charts | Recharts | Analytics visualisation |
| Validation | Zod and MongoDB `$jsonSchema` | API and database-level validation |
| Authentication | bcryptjs, signed HttpOnly cookies | Password hashing and sessions |
| Testing | Vitest | Unit, service and API tests |
| Local services | Docker Compose | PostgreSQL and MongoDB containers |
| Version control | Git and GitHub | Source control and collaboration |

---

## 5. Database Design

### 5.1 Relational entities

The PostgreSQL schema includes the following main entities:

| Table | Purpose |
|---|---|
| `users` | User accounts, password hashes and roles |
| `categories` | Place categories and parent-child hierarchy |
| `places` | Place details and PostGIS geographic location |
| `place_categories` | Many-to-many relationship between places and categories |
| `place_hours_profiles` | Optional opening-hours profile for a place |
| `place_weekly_hours` | Weekly opening and closing intervals |
| `reviews` | Place reviews, ratings and moderation state |
| `review_embeddings` | Optional vector representation associated with a review |
| `check_ins` | User check-ins at places |
| `audit_logs` | Administrative and resource-change audit events |
| `auth_sessions` | Revocable, expiring authentication sessions (created by migration 002) |

The relational ER diagram is maintained in [`docs/er-diagram.mmd`](./docs/er-diagram.mmd). The data dictionary is in [`docs/data-dictionary.md`](./docs/data-dictionary.md).

### 5.2 MongoDB document model

The `gps_traces` collection stores a trace document with fields such as `userId`, `deviceId`, `points`, `batteryLevel`, `metadata`, `createdAt` and `updatedAt`. The `points` array embeds the chronological GPS readings for that trace.

MongoDB validation and index setup are implemented in [`src/lib/mongodb.ts`](./src/lib/mongodb.ts). The TypeScript data model is in [`src/types/gps.ts`](./src/types/gps.ts).

### 5.3 Database features demonstrated

**PostgreSQL / PostGIS**

- Primary keys, foreign keys, unique constraints and check constraints.
- Relational junction table for the many-to-many place/category relationship.
- Indexes, including a GiST spatial index and GIN full-text index.
- SQL view: `published_place_rating_summary`.
- Database functions for opening-hours checks, coordinate validation, nearby-place search and auditing.
- Triggers for updated timestamps, schedule validation and audit logging.
- Transactions and commit/rollback verification.
- Full-text search over review text.

**MongoDB**

- Embedded document model for GPS traces.
- Collection-level `$jsonSchema` validation.
- Compound, temporal and geospatial indexes.
- Aggregation pipelines for platform, trace, user, daily and device analytics.
- CRUD operations through the trace service and API.

---

## 6. API Overview

The backend is implemented using Next.js Route Handlers under `src/app/api/`.

### GPS trace endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/traces` | List traces with filters and pagination |
| POST | `/api/traces` | Create a GPS trace |
| GET | `/api/traces/[id]` | Retrieve one trace |
| PATCH | `/api/traces/[id]` | Update permitted trace metadata |
| DELETE | `/api/traces/[id]` | Delete a trace |

### Analytics endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/analytics/overview` | Platform-wide movement metrics |
| GET | `/api/analytics/traces/[id]` | Analytics for one trace |
| GET | `/api/analytics/users/[userId]` | User-level movement summary |
| GET | `/api/analytics/daily` | Daily movement summaries |
| GET | `/api/analytics/devices` | Device-level activity |
| GET | `/api/analytics/charts` | Chart-ready analytics data |

### Place and authentication endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/places/nearby` | Nearby place search using PostGIS |
| GET | `/api/places/[id]` | Retrieve place details |
| GET | `/api/categories` | Retrieve place categories |
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Authenticate an account |
| POST | `/api/auth/logout` | Revoke the current session |
| GET | `/api/auth/me` | Retrieve the current authenticated user |
| GET | `/api/admin/overview` | Admin-protected summary |

For request parameters, payloads and response examples, see [`docs/API.md`](./docs/API.md) and [`docs/spatial-api.md`](./docs/spatial-api.md).

---

## 7. Repository Structure

```text
Meridian-Geospatial-Intelligence-Platform/
│
├── database/                         # PostgreSQL/PostGIS implementation
│   ├── Dockerfile                    # Custom PostgreSQL image
│   ├── init/
│   │   └── 01-extensions.sql         # Enables PostGIS and pgvector
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    # Relational schema, functions, views, triggers, indexes
│   │   └── 002_authentication.sql    # Authentication constraints and sessions table
│   ├── queries/
│   │   ├── nearby_places.sql         # Nearby-place spatial query
│   │   └── review_keyword_search.sql # Review full-text/keyword query
│   ├── seeds/
│   │   └── 001_demo_data.sql         # Relational demonstration records
│   └── tests/
│       ├── README.md                 # SQL verification instructions
│       └── verify.sql                # Constraints, spatial, trigger and transaction checks
│
├── docs/                             # Design, setup and DBMS documentation
│   ├── API.md                        # API contracts and examples
│   ├── DBMS_CONCEPTS.md              # MongoDB and GPS analytics concepts
│   ├── SETUP.md                      # Setup instructions
│   ├── architecture.md               # Architecture and design rationale
│   ├── authentication.md              # Authentication design and setup
│   ├── data-dictionary.md             # Relational data dictionary
│   ├── er-diagram.mmd                 # Relational ER diagram
│   ├── integration-contracts.md       # Data/API integration contracts
│   ├── integration.md                 # Combined application setup and integration
│   └── spatial-api.md                 # Spatial API documentation
│
├── public/                            # Static assets and SVGs
├── scripts/
│   └── seed.ts                        # MongoDB validation, indexes and GPS demo data
│
├── src/
│   ├── app/                           # Next.js pages and API routes
│   │   ├── api/
│   │   │   ├── admin/                 # Admin overview endpoint
│   │   │   ├── analytics/             # Analytics endpoints
│   │   │   ├── auth/                  # Register, login, logout and session endpoints
│   │   │   ├── categories/            # Category endpoint
│   │   │   ├── places/                # Place and nearby-search endpoints
│   │   │   └── traces/                # GPS trace CRUD endpoints
│   │   ├── analytics/                 # Analytics dashboard page
│   │   ├── dbms-concepts/             # Interactive DBMS/viva guide
│   │   ├── login/                     # Login page
│   │   ├── register/                  # Registration page
│   │   ├── spatial/                   # Place explorer page
│   │   ├── traces/                    # Trace list and trace detail pages
│   │   ├── globals.css                # Global styles
│   │   ├── layout.tsx                 # Root application layout
│   │   └── page.tsx                   # Main dashboard
│   │
│   ├── components/                    # Reusable React components
│   │   ├── charts/                    # Analytics charts
│   │   ├── dashboard/                 # Dashboard metric cards
│   │   ├── layout/                    # Navigation and layout components
│   │   ├── maps/                      # GPS route maps and wrappers
│   │   ├── traces/                    # Trace table and upload modal
│   │   ├── AuthForm.tsx               # Authentication form
│   │   ├── MapCanvas.tsx              # Spatial map canvas
│   │   └── SpatialSearch.tsx          # Place search interface
│   │
│   ├── lib/                           # Database clients and application logic
│   │   ├── analytics/                 # Haversine and aggregation analytics
│   │   ├── services/                  # Trace database service
│   │   ├── validations/               # Zod validation schemas
│   │   ├── apiResponse.ts             # Standard API response/error handling
│   │   ├── auth.ts                    # Session and role utilities
│   │   ├── db.ts                      # PostgreSQL connection pool
│   │   └── mongodb.ts                 # MongoDB connection, validation and indexes
│   │
│   └── types/                         # Shared TypeScript data types
│
├── tests/                             # Vitest test suite
│   ├── api.test.ts                    # API route tests
│   ├── crud_and_analytics.test.ts     # MongoDB CRUD and aggregation tests
│   ├── haversine.test.ts              # Geographic calculation tests
│   └── validation.test.ts             # GPS payload validation tests
│
├── .env.example                      # Environment variable template
├── docker-compose.yml                # Local PostgreSQL and MongoDB services
├── package.json                      # Dependencies and npm scripts
├── package-lock.json                 # Locked dependency versions
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
├── vitest.config.ts                  # Vitest configuration
├── eslint.config.mjs                 # ESLint configuration
└── postcss.config.mjs                # PostCSS/Tailwind configuration
```

---

## 8. Installation and Execution

### Prerequisites

- Node.js 20 or later (recommended).
- npm.
- Docker Desktop with Docker Compose.
- Git.

### Step 1: Clone the repository

```bash
git clone https://github.com/siasimran-magic/Meridian-Geospatial-Intelligence-Platform.git
cd Meridian-Geospatial-Intelligence-Platform
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Copy the example file:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env.local
```

**macOS / Linux**

```bash
cp .env.example .env.local
```

Configure the values in `.env.local`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/geospatial_platform
DATABASE_URL=postgresql://geointel_dev:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/geointel
POSTGRES_DB=geointel
POSTGRES_USER=geointel_dev
POSTGRES_PASSWORD=YOUR_LOCAL_PASSWORD
MONGO_DB=geospatial_platform
MONGO_PORT=27017
AUTH_SESSION_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_BYTES
```

Use a strong local password and a randomly generated session secret of at least 32 bytes. Do not commit `.env.local` or real credentials.

### Step 4: Start both databases

```bash
docker compose up -d
```

Check container status:

```bash
docker compose ps
```

The PostgreSQL image enables PostGIS and pgvector through `database/init/01-extensions.sql` on first initialization of its data volume.

### Step 5: Apply PostgreSQL migrations and load relational demo data

Run from the repository root:

```bash
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel < database/migrations/001_initial_schema.sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel < database/migrations/002_authentication.sql
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel < database/seeds/001_demo_data.sql
```

If you changed `POSTGRES_USER` or `POSTGRES_DB`, use those configured values in the commands.

### Step 6: Configure MongoDB and insert GPS demonstration data

```bash
npm run seed
```

This script configures collection validation and indexes, then inserts synthetic Bengaluru GPS traces.

### Step 7: Run tests

```bash
npm test
```

### Step 8: Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful application pages

| Page | URL | Purpose |
|---|---|---|
| Overview | `http://localhost:3000/` | GPS overview dashboard |
| Traces | `http://localhost:3000/traces` | Browse and manage GPS traces |
| Analytics | `http://localhost:3000/analytics` | Movement analytics and charts |
| Spatial explorer | `http://localhost:3000/spatial` | Search and explore places |
| Login | `http://localhost:3000/login` | Account login |
| Register | `http://localhost:3000/register` | Account registration |
| DBMS concepts | `http://localhost:3000/dbms-concepts` | DBMS and viva reference |

### Production build check

```bash
npm run build
npm start
```

---

## 9. Testing

The Vitest suite contains tests for:

| Test file | Coverage |
|---|---|
| `tests/haversine.test.ts` | Haversine distance, invalid coordinates, duration and speed calculations |
| `tests/validation.test.ts` | GPS payload validation, coordinate bounds, required fields, update restrictions and ObjectId validation |
| `tests/crud_and_analytics.test.ts` | MongoDB trace creation, retrieval, filtering, pagination, updates, deletion and aggregation pipelines |
| `tests/api.test.ts` | GPS API route behaviour, validation, CRUD and analytics responses |

PostgreSQL verification queries are maintained separately in `database/tests/verify.sql`. Follow `database/tests/README.md` for execution instructions.

Run the tests in an environment where the required database services and environment variables are configured. Do not report a test suite as passing unless it has been executed successfully in that environment.

---

## 10. Documentation

- [Setup guide](./docs/SETUP.md)
- [Architecture and design rationale](./docs/architecture.md)
- [API specification](./docs/API.md)
- [Spatial API](./docs/spatial-api.md)
- [Database concepts and viva guide](./docs/DBMS_CONCEPTS.md)
- [Data dictionary](./docs/data-dictionary.md)
- [ER diagram](./docs/er-diagram.mmd)
- [Authentication design](./docs/authentication.md)
- [Integration guide](./docs/integration.md)
- [Integration contracts](./docs/integration-contracts.md)
- [PostgreSQL verification guide](./database/tests/README.md)

---


## 11. Project Objective

Meridian demonstrates how relational database management, NoSQL document storage, geospatial indexing, spatial SQL operations, aggregation pipelines and a web-based application can be combined to build a practical geographic intelligence system. It connects database design and implementation to user-facing location search, GPS trajectory management and movement analytics.
