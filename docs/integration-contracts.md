# Person 1 / Person 2 integration contracts

This contract defines boundaries for the PostgreSQL/PostGIS work (Person 1) and later MongoDB GPS plus pgvector/review intelligence work (Person 2). It is a design handoff; no collection, table, API, or migration is created here.

## Shared identifiers and serialization

- Use UUIDs for `users.user_id`, `places.place_id`, `reviews.review_id`, and MongoDB trace IDs (`_id`). Generate with a UUID library or PostgreSQL `gen_random_uuid()`.
- Serialize IDs as lowercase hyphenated UUID strings in JSON, URL paths, and MongoDB `userId`/`placeId` fields. MongoDB may use the trace UUID string as `_id`; do not use `ObjectId` for cross-store entities.
- UUIDs identify records, not authorization. Every API must verify that the current user may access the requested record.
- Times crossing APIs are ISO 8601 UTC instants (for example `2026-10-28T08:00:00Z`). Local business opening times are separately interpreted through the place's IANA zone.
- Coordinates crossing APIs/GeoJSON use longitude first, latitude second; speed is meters/second, accuracy is meters.

## Ownership

| Data | Source of truth | Owner |
|---|---|---|
| User identity, role, email, password hash | PostgreSQL `users` | Person 1 / application auth owner |
| Place, coordinates, addresses, categories, weekly hours, reviews, ratings, check-ins | PostgreSQL relational tables | Person 1 |
| GPS trace sessions, device metadata, timestamped points, movement-derived trace analytics | MongoDB `trajectory_traces` (or later approved time-series/chunked design) | Person 2 |
| Review embedding vectors plus model/revision/hash metadata | PostgreSQL `review_embeddings` using pgvector; source review remains `reviews` | Person 2 owns embedding generation/index/query logic; coordinate migrations with Person 1 |
| Cross-store references | UUID strings, no distributed FK | API/service layer |

Person 2 must not independently redefine `users.user_id`, `reviews.review_id`, the 1.0-5.0 half-step rating scale, nullable review body, vector dimension, or review moderation rules. Request a versioned design change before changing them.

## Expected relationships and consistency

- A trajectory document's `userId` references `users.user_id` as a string. MongoDB cannot enforce that PostgreSQL FK. API validation and deletion/retention workflows maintain eventual consistency.
- A future check-in may reference a Mongo trace UUID only if a product use case requires it; do not copy GPS point arrays into PostgreSQL.
- `review_embeddings.review_id` has a PostgreSQL FK to `reviews.review_id`, one current vector per review in the proposed baseline. Review deletion cascades its vector; edits mark/rebuild the vector using `input_sha256` comparison.
- Person 2 reads review text/status from PostgreSQL and writes embeddings via a narrowly scoped service/database role. It must not update authoritative review text, rating, user role, or place data.
- Cross-database workflows are not distributed transactions. Use idempotent writes and an outbox/retry mechanism if reliable event propagation becomes necessary; do not claim atomicity across PostgreSQL and MongoDB.

## Suggested API boundaries

- **Person 1 APIs:** place CRUD/moderation; nearby search (center, radius, category IDs, minimum rating, open-at instant); place details and hours; review submission/listing; check-in write; auth/role enforcement. Nearby search accepts explicit coordinates and bounded radius and returns distance in meters with stable pagination.
- **Person 2 APIs/services:** trajectory ingest and authorized retrieval; trajectory analytics aggregates; review embedding backfill/update worker; semantic review query. Semantic API returns review UUIDs plus scores, then obtains current published review/place details from PostgreSQL. Do not return hidden/pending reviews.
- Keep server-side DB access in Next.js route handlers/server modules or a dedicated service. The browser never receives credentials and does not connect directly to either database.
- Use parameterized SQL and MongoDB queries. Restrict endpoints by ownership/admin policies and rate-limit GPS ingestion/search as appropriate.

## Database connection conventions

- Local PostgreSQL service name: `postgres`; database `geointel`; development user `geointel_dev`; host-side port 5432. Use `.env` values; never commit `.env` or print credentials in logs.
- Local Mongo service name: `mongodb`; database `geointel`; root/bootstrap credentials from `.env`. Host port defaults to 27017, but may be overridden with `MONGO_PORT` (currently 27018 on Person 1's machine). Containers should connect by service name/port on Compose network, not via a host port.
- Production credentials must be separate least-privilege accounts, not the local bootstrap/root account. Use TLS and managed secrets in a deployed environment.
- Use PostgreSQL transactions for relational writes. For a single request affecting both stores, report partial failure and retry idempotently rather than suggesting a cross-store transaction exists.

## Git handoff

1. Person 1 publishes the architecture docs and relational migration only after review; this task adds docs only.
2. Person 2 pulls the shared branch before implementing Mongo/pgvector work and uses this UUID/model contract.
3. If Person 2 changes dimensions, model, collection shape, ownership, or ID format, update `data-dictionary.md`, `architecture.md`, and this contract in the same PR before code depends on the change.
4. Keep secrets, raw trajectories, generated embeddings, and local database files out of Git. Add migrations/index definitions and reproducible tests with the eventual owning implementation.
5. Do not push or commit this design task without the project owner's instruction.
