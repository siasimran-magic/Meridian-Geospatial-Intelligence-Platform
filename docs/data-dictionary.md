# Implemented PostgreSQL data dictionary and MongoDB handoff

This dictionary now describes the implemented PostgreSQL design and its migration in `database/migrations/001_initial_schema.sql`. MongoDB collections remain a handoff proposal only. UUID defaults use PostgreSQL 16's built-in `gen_random_uuid()`; no extra extension is needed for that default. `timestamptz` is shorthand for `timestamp with time zone`. Foreign-key actions are spelled out because deletion behavior is part of the contract.

## Conventions and decisions

- Canonical IDs are UUIDs (RFC 4122 style; generate with PostgreSQL `gen_random_uuid()` or an application UUID library). Serialize them as lowercase hyphenated strings in JSON/MongoDB. In MongoDB store these as strings, not BSON `ObjectId`, so IDs can be joined across stores without translation.
- Review ratings are **1.0 through 5.0** inclusive (`numeric(2,1)`) and must use increments of 0.5. Rating-only reviews are allowed; review text is nullable and may not be blank when provided.
- A place has one WGS84 `geography(Point,4326)`. Coordinates are supplied as longitude, latitude, in that order. A GiST index supports meter-based distance predicates.
- `places.time_zone` stores an IANA time-zone identifier (for example `Asia/Kolkata`). Opening times are local wall-clock `time without time zone`, interpreted using that identifier. Events and audit timestamps use `timestamptz`.
- Absence of a `place_hours_profiles` row means hours are **unknown**. A profile row means the weekly schedule is known; it must define all seven ISO weekdays. A closed day has an explicit `is_closed=true` row with null times. It is never inferred that missing hours mean open.
- Business entities are soft-deactivated with `places.is_active` or `users.is_active` where history should remain. Avoid hard deletes for places with reviews. Deletion actions below describe hard-delete behavior.

## Relational tables

### `users`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `user_id` | `uuid` | NOT NULL / `gen_random_uuid()` | PK. Shared identity key for MongoDB `userId`. |
| `email` | `text` | NOT NULL | Login/contact email; check trimmed non-empty. A unique expression index on `lower(email)` enforces case-insensitive uniqueness without requiring `citext`. |
| `display_name` | `text` | NOT NULL | Public display label; trimmed non-empty. |
| `password_hash` | `text` | NULL | If present, must have an Argon2id v=19 encoded prefix. NULL means no local password credential (external-auth or synthetic demo account); login must reject it. Never store plaintext or reversible encryption. |
| `role` | `text` | NOT NULL / `'user'` | CHECK in (`'user'`, `'admin'`). Keep authorization checks server-side. Single role per account is sufficient for this project. |
| `is_active` | `boolean` | NOT NULL / `true` | Disables login without losing references/history. |
| `created_at` | `timestamptz` | NOT NULL / `now()` | Account creation instant. |
| `updated_at` | `timestamptz` | NOT NULL / `now()` | Updated on changes by application or a standard timestamp trigger. |

Indexes: PK; unique index on `lower(email)`; `(role, is_active)` for admin operations. No foreign keys. `users` has one-to-many relationships to created places, reviews, check-ins, and audit events. Hard deletion sets optional authorship references to null or cascades personal check-ins, as specified below. Password hash storage should use Argon2id with a vetted library and current OWASP parameters at implementation time.

### `categories`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `category_id` | `uuid` | NOT NULL / generated | PK. |
| `name` | `text` | NOT NULL | Display label; trimmed non-empty. |
| `slug` | `text` | NOT NULL | UNIQUE, stable lowercase URL/API key; CHECK matches a conservative slug format such as `^[a-z0-9]+(-[a-z0-9]+)*$`. |
| `description` | `text` | NULL | Optional explanation. |
| `parent_category_id` | `uuid` | NULL | Self-FK to `categories.category_id`, `ON DELETE SET NULL`; supports a hierarchy. Application validation must prevent multi-row cycles; the database prevents only direct self-parenting. |
| `created_at` | `timestamptz` | NOT NULL / `now()` | Creation instant. |

Indexes: PK, unique `slug`, index on `parent_category_id`. A category has many children and participates in the place/category many-to-many relationship. Categories referenced by a place should be retired/renamed rather than hard-deleted.

### `places`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `place_id` | `uuid` | NOT NULL / generated | PK and MongoDB `placeId` if later needed. |
| `name` | `text` | NOT NULL | Trimmed non-empty name. |
| `description` | `text` | NULL | Optional descriptive text. |
| `address_line1` | `text` | NULL | Street address. |
| `address_line2` | `text` | NULL | Unit/suite. |
| `locality` | `text` | NULL | City/town. |
| `region` | `text` | NULL | State/province. |
| `postal_code` | `text` | NULL | Postal code. |
| `country_code` | `char(2)` | NULL | ISO 3166-1 alpha-2, uppercase if supplied; CHECK format. |
| `location` | `geography(Point,4326)` | NOT NULL | WGS84 point; longitude is X and latitude is Y. All raw coordinate writes must call `checked_geography_point(longitude, latitude)`, which rejects out-of-range values before PostGIS geography normalization. |
| `time_zone` | `text` | NOT NULL | IANA zone for local opening times; validate against the server/application time-zone database. |
| `phone` | `text` | NULL | Optional contact data. |
| `website_url` | `text` | NULL | Optional URL; validate scheme/format in the API. |
| `is_active` | `boolean` | NOT NULL / `true` | Exclude closed/removed places from ordinary searches without destroying history. |
| `created_by_user_id` | `uuid` | NULL | FK to `users.user_id`, `ON DELETE SET NULL`. |
| `created_at` | `timestamptz` | NOT NULL / `now()` | Creation instant. |
| `updated_at` | `timestamptz` | NOT NULL / `now()` | Update instant. |

Indexes: PK; **GiST on `location`**; B-tree on `is_active`; `(locality, is_active)` for locality filters. PostGIS normalizes some out-of-range longitudes when casting to geography, so the database helper is the required construction path for raw coordinates. Do not duplicate latitude/longitude or store a mutable `average_rating`/review count. Compute rating aggregates from reviews. Place has one-to-many reviews/check-ins; many-to-many categories through `place_categories`; optional one-to-one hours profile.

### `place_categories`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `place_id` | `uuid` | NOT NULL | PK part; FK to places, `ON DELETE CASCADE`. |
| `category_id` | `uuid` | NOT NULL | PK part; FK to categories, `ON DELETE RESTRICT`. |

Composite PK `(place_id, category_id)` prevents duplicate assignment. Add reverse B-tree index `(category_id, place_id)` for category-first filters. This junction normalizes the many-to-many relationship; no category array is duplicated on `places`.

### `place_hours_profiles`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `place_id` | `uuid` | NOT NULL | PK and FK to `places`, `ON DELETE CASCADE`; establishes zero-or-one profile per place. |
| `verified_at` | `timestamptz` | NULL | When the schedule was last checked. |
| `updated_at` | `timestamptz` | NOT NULL / `now()` | Last profile update. |

No row means unknown hours. Presence means a complete known weekly schedule. A deferred constraint trigger or transaction-level validation should require a weekday definition for ISO weekdays 1 through 7 before commit; this cross-row rule cannot be expressed as a simple `CHECK`.

### `place_weekly_hours`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `place_id` | `uuid` | NOT NULL | FK to `place_hours_profiles`, `ON DELETE CASCADE`. |
| `iso_weekday` | `smallint` | NOT NULL | ISO weekday 1=Monday through 7=Sunday; CHECK `BETWEEN 1 AND 7`. |
| `period_no` | `smallint` | NOT NULL | One-based interval number; CHECK `> 0`. Allows lunch breaks/multiple opening periods. |
| `is_closed` | `boolean` | NOT NULL / `false` | True means explicitly closed on this day. A closed day must have exactly one period row. |
| `opens_at` | `time without time zone` | NULL | Local wall time at the place. Required for open interval. |
| `closes_at` | `time without time zone` | NULL | Local wall time; must be later than `opens_at`. Overnight hours split across two local weekdays. |

Composite PK `(place_id, iso_weekday, period_no)`. CHECK requires either closed with both times null, or open with both times non-null and `opens_at < closes_at`. Index `(iso_weekday, place_id)`. A deferred trigger/application validator should reject multiple intervals on a closed day, overlapping intervals, and profiles missing weekdays. Join to `places.time_zone` to evaluate “open now”; convert the current instant to that zone before comparing local times. No rows/profile must return “unknown,” not “open.”

### `reviews`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `review_id` | `uuid` | NOT NULL / generated | PK; referenced by Mongo only if needed, but embedding linkage remains in PostgreSQL. |
| `place_id` | `uuid` | NOT NULL | FK to `places`, `ON DELETE RESTRICT`. |
| `author_user_id` | `uuid` | NULL | FK to `users`, `ON DELETE SET NULL`; permits retaining review after account erasure/anonymization. |
| `rating` | `numeric(2,1)` | NOT NULL | CHECK `rating BETWEEN 1.0 AND 5.0` and `rating * 2 = trunc(rating * 2)`; allowed values step by 0.5. |
| `body` | `text` | NULL | Rating-only reviews are permitted. If present it must be trimmed and non-empty. Store plain text; escape on rendering. |
| `moderation_status` | `text` | NOT NULL / `'published'` | CHECK in (`'pending'`, `'published'`, `'hidden'`). Only published reviews appear in public aggregates/search. |
| `created_at` | `timestamptz` | NOT NULL / `now()` | Creation instant. |
| `updated_at` | `timestamptz` | NOT NULL / `now()` | Edited instant. |
| `search_document` | `tsvector` | generated stored | `to_tsvector('english', coalesce(body,''))`; generated from optional source text, never independently edited. Rating-only reviews produce an empty vector and do not match keyword queries. |

Indexes: PK; B-tree `(place_id, created_at DESC)`; B-tree `(author_user_id, created_at DESC)`; partial GIN on `search_document` for published reviews. No uniqueness on `(author_user_id, place_id)` so a user may review again; add edit/version policy separately. Average ratings are computed from published reviews.

### `review_embeddings`

One current embedding per review is the selected design. Use `sentence-transformers/all-MiniLM-L6-v2`, with its 384-dimensional output. This permits local inference and avoids sending review text to an external embedding API. Pin an immutable model revision in the Person 2 module before generating vectors. The model card specifies 384-dimensional vectors. ([Model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2))

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `review_id` | `uuid` | NOT NULL | PK and FK to `reviews`, `ON DELETE CASCADE`; enforces one embedding row per review. |
| `embedding` | `vector(384)` | NOT NULL | Dimension is fixed to the selected model output. Do not silently change model/dimension; a new model requires an explicit migration/re-embedding plan. |
| `model_name` | `text` | NOT NULL | Expected identifier `sentence-transformers/all-MiniLM-L6-v2`. |
| `model_revision` | `text` | NOT NULL | Immutable upstream commit/revision, not the mutable `main` branch name. |
| `input_sha256` | `char(64)` | NOT NULL | SHA-256 of the exact normalized text sent to the model; supports stale-embedding detection without copying review text. |
| `created_at` | `timestamptz` | NOT NULL / `now()` | Embedding generation instant. |

Indexes: PK; HNSW `USING hnsw (embedding vector_cosine_ops)`. Cosine distance is selected for sentence embeddings; the encoder's output and query vectors must use identical preprocessing/model revision. Search joins top-k `review_id` values back to `reviews`, `places`, and categories for text, rating, moderation, and location filters. No embeddings are generated by the seed or migration. A separate partial vector index per model is unnecessary while this table holds one fixed model. If multiple models must coexist, change the key and indexing design explicitly rather than mixing spaces.

### `check_ins`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `check_in_id` | `uuid` | NOT NULL / generated | PK. |
| `user_id` | `uuid` | NOT NULL | FK to `users`, `ON DELETE CASCADE` for user-owned activity. |
| `place_id` | `uuid` | NOT NULL | FK to `places`, `ON DELETE RESTRICT`. |
| `checked_in_at` | `timestamptz` | NOT NULL / `now()` | Event instant. |
| `source` | `text` | NOT NULL / `'manual'` | CHECK in (`'manual'`, `'trajectory'`, `'other'`). GPS details remain in MongoDB; this row is a relational place interaction. |

Indexes: PK; `(place_id, checked_in_at DESC)` for popularity windows; `(user_id, checked_in_at DESC)` for user history. Do not impose a uniqueness rule without a product definition for repeated visits.

### `audit_logs`

| Column | Type | Null/default | Constraints and meaning |
|---|---|---|---|
| `audit_log_id` | `bigint GENERATED ALWAYS AS IDENTITY` | NOT NULL | PK; sequential key is appropriate for append-only internal logs. |
| `actor_user_id` | `uuid` | NULL | FK to `users`, `ON DELETE SET NULL`. Null also represents a system actor. |
| `action` | `text` | NOT NULL | Controlled application action name; CHECK non-empty. |
| `resource_type` | `text` | NOT NULL | Logical entity name. |
| `resource_id` | `uuid` | NULL | UUID of the target when applicable. A generic polymorphic reference intentionally has no target FK. |
| `occurred_at` | `timestamptz` | NOT NULL / `now()` | Event instant. |
| `request_id` | `uuid` | NULL | Correlation key for a request/operation. |
| `details` | `jsonb` | NOT NULL / `'{}'` | CHECK `jsonb_typeof(details)='object'`; allowlisted, non-sensitive context only. Never store passwords, tokens, raw GPS, or review text here. |

Indexes: PK; `(occurred_at DESC)`; `(actor_user_id, occurred_at DESC)`; `(resource_type, resource_id, occurred_at DESC)`. Append-only permissions/policy are preferred; audit writes should be in the same PostgreSQL transaction as the audited change when atomicity is required.

## Relationship summary and normalization

- `places` ↔ `categories` is many-to-many and is normalized through `place_categories`.
- A category may have one parent category; the self-reference is one-to-many.
- A place has zero-or-one hours profile; a profile has weekday/interval rows. Closed and unknown remain distinct.
- Places have many reviews and check-ins. Users have many authored reviews/check-ins and may create places. User deletion preserves review/audit history by nulling author references; personal check-ins cascade.
- A review has zero-or-one embedding. The embedding is derived data, so it cascades when the review is hard-deleted and can be regenerated from its source text.
- `search_document` and embeddings are deliberate derived representations; they are tied to review text and should be refreshed transactionally/asynchronously after edits. Average ratings, distances, and place coordinates duplicated as scalar latitude/longitude are not stored redundantly.
- `audit_logs.resource_id` is a deliberate polymorphic reference so one append-only table can cover several entity types. It cannot receive a conventional FK; validate resource type and target in application code.

## Implemented functions and triggers

- `checked_geography_point(longitude, latitude)` rejects raw longitude/latitude outside WGS84 bounds before constructing a `geography(Point,4326)`. PostGIS may normalize out-of-range longitude during a direct cast, so application and seed writes must call this function.
- `nearby_places(longitude, latitude, radius_m, category_slug, min_rating)` validates inputs, calls `ST_DWithin` for radius filtering, returns `ST_Distance` in meters, and sorts nearest-first. Radius is greater than zero and capped at 100,000 m.
- `place_is_open(place_id, at)` evaluates recurring local-time periods using the place's IANA zone. It returns `true`, `false`, or `NULL` (unknown/inactive/missing place).
- `published_place_rating_summary` is a regular view over active places and published reviews; count/average are not persisted redundantly.
- `set_updated_at()` fires before updates to users, places, hours profiles, and reviews.
- `validate_place_weekly_schedule()` runs as a deferred constraint trigger at transaction end. A known profile must define all seven days; closed days have one explicit row; intervals may not overlap.
- `audit_admin_change()` fires after place/category/hours insert, update, or delete, and review moderation changes. The trusted application sets transaction-local `app.user_id`; the function verifies the account is active and has role `admin`, then stores action/resource and changed column names (not field values) in `audit_logs`. Writes without a valid admin context are not recorded by these triggers.

## MongoDB GPS document design (Person 2 owned)

Collection: `trajectory_traces`. One document per trace/session, with an ordered `points` array for short traces. Keep trace size under MongoDB's 16 MiB BSON document limit; for long trips use chunked trace documents or a point-per-document/time-series design after measuring write/query patterns. Suggested first shape:

```javascript
{
  _id: "<trace UUID>",
  userId: "<PostgreSQL users.user_id UUID>",
  deviceId: "<stable installation/device UUID>",
  startedAt: ISODate("2026-10-28T08:00:00Z"),
  endedAt: ISODate("2026-10-28T08:42:00Z"),
  device: {
    platform: "android",
    model: "example-device",
    appVersion: "0.1.0"
  },
  points: [
    {
      timestamp: ISODate("2026-10-28T08:00:00Z"),
      coordinates: { type: "Point", coordinates: [77.5946, 12.9716] },
      speedMps: 2.4,
      accuracyM: 8.0
    }
  ],
  schemaVersion: 1,
  createdAt: ISODate("2026-10-28T08:42:02Z")
}
```

Coordinates use GeoJSON order `[longitude, latitude]`; timestamps are BSON UTC dates. Speed is meters/second and accuracy is meters. `deviceId` identifies an installation, not a person; do not use hardware serial/advertising IDs. `userId` is the lowercase hyphenated UUID string matching PostgreSQL. MongoDB does not enforce a cross-database FK: validate the user through the API before writes, and accept that referential integrity is eventual across stores. Recommended indexes: `{userId:1, startedAt:-1}`, `{deviceId:1, startedAt:-1}`, and a 2dsphere index on `points.coordinates` only if point-in-trace geospatial filtering is needed. For time-window analytics, an index on `startedAt` or an appropriately configured time-series collection should be evaluated; retention policy is a privacy/product decision. Aggregations can unwind points, sort by timestamp, compute consecutive-point deltas, group distance/speed/activity by user and time bucket, and report trace counts. Filter malformed/low-accuracy GPS samples and avoid claiming exact distance from noisy raw points.

## pgvector retrieval contract

`review_embeddings.review_id` is the UUID link to the authoritative review row. Store model name, immutable revision, fixed 384 dimension, normalized-input hash, and generation time alongside the vector. Query text must be embedded by the same model/revision and preprocessing. Rank by cosine distance (`<=>`) with HNSW cosine ops; return `review_id` and distance, then join reviews/places/categories in PostgreSQL and apply `moderation_status='published'` plus rating, category, or geographic filters. Validate whether post-filtering reduces recall at expected scale. Model changes require a re-embedding/backfill plan; vectors from different models are not comparable. Do not store personally identifying or GPS data in embedding metadata.
