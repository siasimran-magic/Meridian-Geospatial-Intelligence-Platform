# Unified platform integration

The root Next.js App Router hosts both modules:

- `/`, `/traces`, and `/analytics` provide MongoDB GPS ingestion, route maps,
  CRUD APIs, and analytics.
- `/spatial` provides the PostgreSQL/PostGIS place explorer.
- `/login` and `/register` provide PostgreSQL-backed bcrypt authentication.

PostgreSQL is the source of truth for accounts, roles, places, categories,
hours, reviews, check-ins, audit logs, and sessions. MongoDB remains the source
of truth for `geospatial_platform.gps_traces`. The browser never connects
directly to either database.

The cross-store reference is the lowercase UUID/string user identifier.
MongoDB cannot enforce the PostgreSQL foreign key, so ownership checks belong
in the API layer. There is no distributed transaction between the stores.

## Local setup

1. Copy `.env.example` to `.env.local` and set a unique
   `AUTH_SESSION_SECRET` with at least 32 bytes.
2. Run `docker compose up -d`.
3. Apply `database/migrations/001_initial_schema.sql` and
   `database/migrations/002_authentication.sql` to PostgreSQL, then load
   `database/seeds/001_demo_data.sql`.
4. Run `npm run seed` for MongoDB validation, indexes, and demo traces.
5. Run `npm run dev`.

The PostgreSQL scripts are additive and do not reset existing volumes.
MongoDB keeps the existing `gps_traces` collection and database name.

## API ownership

Public read-only spatial discovery is exposed by `/api/places/nearby`,
`/api/places/[id]`, and `/api/categories`. Authentication uses
`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and
`/api/auth/me`; `/api/admin/overview` requires an admin session. GPS and
analytics endpoints retain their existing MongoDB contracts.
