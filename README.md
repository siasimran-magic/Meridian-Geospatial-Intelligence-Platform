# Geospatial Intelligence Platform

Database infrastructure for local development. The existing Next.js application is in `web/`; this setup does not modify it.

## Prerequisites

- Docker Desktop (or Docker Engine) with Docker Compose v2, running with Linux containers.
- Git, if you are cloning the project.

## Database architecture

- **PostgreSQL 16** on `127.0.0.1:5432`, using `pgvector/pgvector:pg16` plus PostGIS 3 installed from PostgreSQL's Debian packages. Both extensions run in the same PostgreSQL instance and the `geointel` database.
- **MongoDB 8.0** on `127.0.0.1:27017` by default, initialized for `geointel` with a local development root account. Set `MONGO_PORT` in `.env` if another local MongoDB service already uses that port.
- Docker named volumes `postgres_data` and `mongodb_data` preserve database files when containers are stopped or recreated.

## Initial setup

From the repository root, create a local environment file and replace both example passwords with local secrets:

```powershell
Copy-Item .env.example .env
```

Start both databases (the PostgreSQL image is built locally on the first run):

```powershell
docker compose up -d --build
```

Check container state and health:

```powershell
docker compose ps
```

## Connecting

PostgreSQL defaults to database `geointel` and user `geointel_dev`:

```powershell
docker compose exec postgres psql -U geointel_dev -d geointel
```

MongoDB uses the root username and password from `.env`; the initialized database is `geointel` (the host port is `MONGO_PORT`, default `27017`):

```powershell
docker compose exec mongodb mongosh --username geointel_dev --password --authenticationDatabase admin geointel
```

The `--password` option prompts for the password. Both ports bind only to localhost.

## Verify PostgreSQL extensions

```powershell
docker compose exec -T postgres psql -U geointel_dev -d geointel -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS vector; SELECT PostGIS_Full_Version(); SELECT extname FROM pg_extension ORDER BY extname;"
```

The output should include PostGIS full version details and `postgis` and `vector` in the extension list.

## Verify MongoDB connectivity

```powershell
docker compose exec mongodb mongosh --quiet --username geointel_dev --password YOUR_MONGO_ROOT_PASSWORD --authenticationDatabase admin geointel --eval "db.adminCommand('ping')"
```

Replace `YOUR_MONGO_ROOT_PASSWORD` with the value in `.env`; a successful response contains `ok: 1`.

## PostgreSQL schema, demo data, and verification

The relational schema is maintained as numbered SQL migrations under `database/migrations/`. It is separate from `database/init/01-extensions.sql`, which remains limited to extension initialization. Apply the initial migration from the project root in PowerShell:

```powershell
Get-Content -Raw .\database\migrations\001_initial_schema.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel
```

Load the clearly labelled synthetic sample data (five users, eight categories, twenty places, thirty-two reviews, and five check-ins):

```powershell
Get-Content -Raw .\database\seeds\001_demo_data.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel
```

The migration and seed are safe to rerun against the same schema. Seed rows use stable UUIDs and `ON CONFLICT DO NOTHING`. Demo accounts have no local password credential; they are for relational tests only. Never use this seed data as real user data.

Run database assertions and print the GiST query plan:

```powershell
Get-Content -Raw .\database\tests\verify.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel
```

The verification script checks schema objects and constraints, invalid ratings/coordinates, spatial radius/category/rating filtering, meter distances, opening-hours unknown/open/closed semantics, the rating view, admin audit triggers, full-text search, transactions, seed counts, and GiST plan evidence. Its plan section temporarily disables sequential scans only to demonstrate the spatial index on the small synthetic dataset.

Useful SQL examples are in `database/queries/nearby_places.sql` and `database/queries/review_keyword_search.sql`. `nearby_places()` accepts longitude, latitude, radius in meters (up to 100 km), optional category slug, and optional minimum rating. `place_is_open()` returns `true`, `false`, or `NULL` when hours are unknown or the place is unavailable. For writes, construct coordinates with `checked_geography_point(longitude, latitude)`; it validates raw bounds before PostGIS converts them to geography.

For future schema changes, add a new numbered migration rather than editing an already-applied migration. Review and apply migrations explicitly; Compose does not automatically alter an existing database volume.

## Stop and storage

Stop containers while preserving data:

```powershell
docker compose down
```

Start again with `docker compose up -d`. PostgreSQL and MongoDB data reside in the named volumes `postgres_data` and `mongodb_data`, independently of container lifetimes. Do not use `docker compose down -v` unless you intend to remove the database volumes and all stored data.

## Spatial search application

The Next.js application lives in `web/`. Start the database services first, then create the server-only web environment file:

```powershell
Copy-Item .\web\.env.example .\web\.env.local
```

Set `DATABASE_URL` in `web/.env.local` to the PostgreSQL service. It must use the PostgreSQL credentials from the root `.env`, with any reserved password characters URL-encoded. Keep this value server-side; do not prefix it with `NEXT_PUBLIC_`. The local web environment file is ignored by Git.

Install dependencies and run the web app:

```powershell
Set-Location .\web
npm ci
npm run dev
```

Open `http://localhost:3000`. The map starts near the seeded Bengaluru places. Use the browser location button (with browser permission) or click the map to set the search center. Search radius, database categories, minimum rating, opening status, and sort order update the PostGIS-backed results. Selecting a result opens its map popup and loads place details and published reviews.

The API uses the server-side PostgreSQL pool from `DATABASE_URL`. Endpoints and parameters are documented in [docs/spatial-api.md](docs/spatial-api.md). The nearby search uses the `nearby_places()` database function and `place_is_open()`; results include GeoJSON point coordinates, distance in meters, ratings, categories, and weekly hours.
