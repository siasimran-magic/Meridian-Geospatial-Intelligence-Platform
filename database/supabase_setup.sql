-- Meridian Geospatial Platform: Complete Supabase Migration Bundle
-- Safe to run in Supabase SQL Editor. Includes Extensions, 3NF Schema, Triggers, Views and Demo Data.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;


-- Geospatial Intelligence Platform: initial relational schema.
-- Safe to rerun on this project database. DDL runs atomically; no existing rows
-- or volumes are dropped. Requires the PostGIS and vector extensions.
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    display_name text NOT NULL,
    -- NULL means no local-password credential (e.g. demo or external identity).
    -- When present, only an Argon2id encoded hash is accepted.
    password_hash text,
    role text NOT NULL DEFAULT 'user',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_nonempty CHECK (email = btrim(email) AND position('@' IN email) > 1),
    CONSTRAINT users_display_name_nonempty CHECK (display_name = btrim(display_name) AND display_name <> ''),
    CONSTRAINT users_role_check CHECK (role IN ('user', 'admin')),
    CONSTRAINT users_password_hash_argon2id CHECK (password_hash IS NULL OR password_hash ~ '^\$argon2id\$v=19\$')
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_active_idx ON users (role, is_active);

CREATE TABLE IF NOT EXISTS categories (
    category_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    parent_category_id uuid REFERENCES categories(category_id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT categories_name_nonempty CHECK (name = btrim(name) AND name <> ''),
    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT categories_no_self_parent CHECK (parent_category_id IS NULL OR parent_category_id <> category_id)
);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories (parent_category_id);

CREATE TABLE IF NOT EXISTS places (
    place_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    address_line1 text,
    address_line2 text,
    locality text,
    region text,
    postal_code text,
    country_code char(2),
    location geography(Point, 4326) NOT NULL,
    time_zone text NOT NULL,
    phone text,
    website_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_by_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT places_name_nonempty CHECK (name = btrim(name) AND name <> ''),
    CONSTRAINT places_timezone_nonempty CHECK (time_zone = btrim(time_zone) AND time_zone <> ''),
    CONSTRAINT places_country_code_format CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
-- Geography normalizes out-of-range longitude during its cast. Validate raw
-- longitude/latitude through checked_geography_point() before constructing it.
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_longitude_range;
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_latitude_range;
CREATE INDEX IF NOT EXISTS places_location_gist_idx ON places USING gist (location);
CREATE INDEX IF NOT EXISTS places_active_idx ON places (is_active);
CREATE INDEX IF NOT EXISTS places_locality_active_idx ON places (locality, is_active);
CREATE INDEX IF NOT EXISTS places_created_by_idx ON places (created_by_user_id);

CREATE TABLE IF NOT EXISTS place_categories (
    place_id uuid NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    PRIMARY KEY (place_id, category_id)
);
CREATE INDEX IF NOT EXISTS place_categories_category_place_idx ON place_categories (category_id, place_id);

CREATE TABLE IF NOT EXISTS place_hours_profiles (
    place_id uuid PRIMARY KEY REFERENCES places(place_id) ON DELETE CASCADE,
    verified_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS place_weekly_hours (
    place_id uuid NOT NULL REFERENCES place_hours_profiles(place_id) ON DELETE CASCADE,
    iso_weekday smallint NOT NULL,
    period_no smallint NOT NULL,
    is_closed boolean NOT NULL DEFAULT false,
    opens_at time without time zone,
    closes_at time without time zone,
    PRIMARY KEY (place_id, iso_weekday, period_no),
    CONSTRAINT weekly_hours_weekday_check CHECK (iso_weekday BETWEEN 1 AND 7),
    CONSTRAINT weekly_hours_period_check CHECK (period_no > 0),
    CONSTRAINT weekly_hours_closed_or_interval_check CHECK (
        (is_closed AND opens_at IS NULL AND closes_at IS NULL)
        OR (NOT is_closed AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
    )
);
CREATE INDEX IF NOT EXISTS weekly_hours_day_place_idx ON place_weekly_hours (iso_weekday, place_id);

CREATE TABLE IF NOT EXISTS reviews (
    review_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id uuid NOT NULL REFERENCES places(place_id) ON DELETE RESTRICT,
    author_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
    rating numeric(2,1) NOT NULL,
    body text,
    moderation_status text NOT NULL DEFAULT 'published',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    search_document tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, coalesce(body, ''))) STORED,
    CONSTRAINT reviews_rating_range_check CHECK (rating BETWEEN 1.0 AND 5.0),
    CONSTRAINT reviews_rating_half_step_check CHECK (rating * 2 = trunc(rating * 2)),
    CONSTRAINT reviews_body_nonempty_if_present CHECK (body IS NULL OR (body = btrim(body) AND body <> '')),
    CONSTRAINT reviews_moderation_status_check CHECK (moderation_status IN ('pending', 'published', 'hidden'))
);
CREATE INDEX IF NOT EXISTS reviews_place_created_idx ON reviews (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_author_created_idx ON reviews (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_published_fts_gin_idx ON reviews USING gin (search_document)
    WHERE moderation_status = 'published';
CREATE INDEX IF NOT EXISTS reviews_published_rating_idx ON reviews (place_id, rating)
    WHERE moderation_status = 'published';

CREATE TABLE IF NOT EXISTS review_embeddings (
    review_id uuid PRIMARY KEY REFERENCES reviews(review_id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    model_name text NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    model_revision text NOT NULL,
    input_sha256 char(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT embeddings_model_name_check CHECK (model_name = 'sentence-transformers/all-MiniLM-L6-v2'),
    CONSTRAINT embeddings_revision_nonempty CHECK (model_revision = btrim(model_revision) AND model_revision <> ''),
    CONSTRAINT embeddings_hash_format CHECK (input_sha256 ~ '^[0-9a-f]{64}$')
);
CREATE INDEX IF NOT EXISTS review_embeddings_hnsw_cosine_idx ON review_embeddings
    USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS check_ins (
    check_in_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    place_id uuid NOT NULL REFERENCES places(place_id) ON DELETE RESTRICT,
    checked_in_at timestamptz NOT NULL DEFAULT now(),
    source text NOT NULL DEFAULT 'manual',
    CONSTRAINT check_ins_source_check CHECK (source IN ('manual', 'trajectory', 'other'))
);
CREATE INDEX IF NOT EXISTS check_ins_place_time_idx ON check_ins (place_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS check_ins_user_time_idx ON check_ins (user_id, checked_in_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_log_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    request_id uuid,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT audit_action_nonempty CHECK (action = btrim(action) AND action <> ''),
    CONSTRAINT audit_resource_type_nonempty CHECK (resource_type = btrim(resource_type) AND resource_type <> ''),
    CONSTRAINT audit_details_object_check CHECK (jsonb_typeof(details) = 'object')
);
CREATE INDEX IF NOT EXISTS audit_logs_time_idx ON audit_logs (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_time_idx ON audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_time_idx ON audit_logs (resource_type, resource_id, occurred_at DESC);

CREATE OR REPLACE VIEW published_place_rating_summary AS
SELECT p.place_id,
       p.name,
       p.locality,
       p.location,
       count(r.review_id)::bigint AS review_count,
       round(avg(r.rating), 2) AS average_rating
FROM places AS p
LEFT JOIN reviews AS r
  ON r.place_id = p.place_id
 AND r.moderation_status = 'published'
WHERE p.is_active
GROUP BY p.place_id;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_place_weekly_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_place_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'place_hours_profiles' THEN
        v_place_id := coalesce(NEW.place_id, OLD.place_id);
    ELSE
        v_place_id := coalesce(NEW.place_id, OLD.place_id);
    END IF;

    -- Deleting a profile also cascades its weekly rows; no remaining schedule to validate.
    IF NOT EXISTS (SELECT 1 FROM place_hours_profiles p WHERE p.place_id = v_place_id) THEN
        RETURN NULL;
    END IF;

    IF EXISTS (
        SELECT d.day_no
        FROM generate_series(1, 7) AS d(day_no)
        LEFT JOIN place_weekly_hours h
          ON h.place_id = v_place_id AND h.iso_weekday = d.day_no
        GROUP BY d.day_no
        HAVING count(h.period_no) = 0
            OR (bool_or(h.is_closed) AND count(h.period_no) <> 1)
            OR (bool_or(h.is_closed) AND bool_or(NOT h.is_closed))
    ) THEN
        RAISE EXCEPTION 'Known weekly hours for place % must define each weekday; closed days need exactly one closed row', v_place_id
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM place_weekly_hours a
        JOIN place_weekly_hours b
          ON b.place_id = a.place_id
         AND b.iso_weekday = a.iso_weekday
         AND b.period_no > a.period_no
         AND NOT b.is_closed
         AND a.opens_at < b.closes_at
         AND a.closes_at > b.opens_at
        WHERE a.place_id = v_place_id AND NOT a.is_closed
    ) THEN
        RAISE EXCEPTION 'Opening intervals overlap for place %', v_place_id USING ERRCODE = '23514';
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS places_weekly_schedule_deferred ON place_hours_profiles;
CREATE CONSTRAINT TRIGGER places_weekly_schedule_deferred
AFTER INSERT OR UPDATE OR DELETE ON place_hours_profiles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_place_weekly_schedule();

DROP TRIGGER IF EXISTS weekly_hours_schedule_deferred ON place_weekly_hours;
CREATE CONSTRAINT TRIGGER weekly_hours_schedule_deferred
AFTER INSERT OR UPDATE OR DELETE ON place_weekly_hours
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_place_weekly_schedule();

CREATE OR REPLACE FUNCTION place_is_open(p_place_id uuid, p_at timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_timezone text;
    v_local_time timestamp without time zone;
    v_isodow smallint;
BEGIN
    SELECT p.time_zone INTO v_timezone FROM places p WHERE p.place_id = p_place_id AND p.is_active;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM place_hours_profiles hp WHERE hp.place_id = p_place_id) THEN
        RETURN NULL;
    END IF;

    v_local_time := p_at AT TIME ZONE v_timezone;
    v_isodow := extract(isodow FROM v_local_time)::smallint;
    RETURN EXISTS (
        SELECT 1
        FROM place_weekly_hours h
        WHERE h.place_id = p_place_id
          AND h.iso_weekday = v_isodow
          AND NOT h.is_closed
          AND v_local_time::time >= h.opens_at
          AND v_local_time::time < h.closes_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION checked_geography_point(p_longitude double precision, p_latitude double precision)
RETURNS geography(Point, 4326)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
BEGIN
    IF p_longitude NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'Longitude must be between -180 and 180' USING ERRCODE = '22023';
    END IF;
    IF p_latitude NOT BETWEEN -90 AND 90 THEN
        RAISE EXCEPTION 'Latitude must be between -90 and 90' USING ERRCODE = '22023';
    END IF;
    RETURN ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
END;
$$;

CREATE OR REPLACE FUNCTION nearby_places(
    p_longitude double precision,
    p_latitude double precision,
    p_radius_m double precision,
    p_category_slug text DEFAULT NULL,
    p_min_rating numeric DEFAULT NULL
)
RETURNS TABLE (
    place_id uuid,
    name text,
    distance_m double precision,
    average_rating numeric,
    review_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_origin geography(Point, 4326);
BEGIN
    IF p_longitude IS NULL OR p_longitude NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'Longitude must be between -180 and 180' USING ERRCODE = '22023';
    END IF;
    IF p_latitude IS NULL OR p_latitude NOT BETWEEN -90 AND 90 THEN
        RAISE EXCEPTION 'Latitude must be between -90 and 90' USING ERRCODE = '22023';
    END IF;
    IF p_radius_m IS NULL OR p_radius_m <= 0 OR p_radius_m > 100000 THEN
        RAISE EXCEPTION 'Radius must be greater than 0 and at most 100000 meters' USING ERRCODE = '22023';
    END IF;
    IF p_min_rating IS NOT NULL AND p_min_rating NOT BETWEEN 1.0 AND 5.0 THEN
        RAISE EXCEPTION 'Minimum rating must be between 1 and 5' USING ERRCODE = '22023';
    END IF;

    v_origin := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    RETURN QUERY
    SELECT p.place_id,
           p.name,
           ST_Distance(p.location, v_origin)::double precision,
           s.average_rating,
           coalesce(s.review_count, 0)::bigint
    FROM places p
    LEFT JOIN published_place_rating_summary s ON s.place_id = p.place_id
    WHERE p.is_active
      AND ST_DWithin(p.location, v_origin, p_radius_m)
      AND (p_category_slug IS NULL OR EXISTS (
          SELECT 1
          FROM place_categories pc
          JOIN categories c ON c.category_id = pc.category_id
          WHERE pc.place_id = p.place_id AND c.slug = p_category_slug
      ))
      AND (p_min_rating IS NULL OR s.average_rating >= p_min_rating)
    ORDER BY ST_Distance(p.location, v_origin), p.place_id;
END;
$$;

CREATE OR REPLACE FUNCTION audit_admin_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor_id uuid;
    v_actor_role text;
    v_old jsonb;
    v_new jsonb;
    v_row jsonb;
    v_resource_id uuid;
    v_changed_columns text[];
BEGIN
    BEGIN
        v_actor_id := nullif(current_setting('app.user_id', true), '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN NULL;
    END;
    IF v_actor_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT u.role INTO v_actor_role FROM users u WHERE u.user_id = v_actor_id AND u.is_active;
    IF v_actor_role IS DISTINCT FROM 'admin' THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_row := to_jsonb(NEW);
        SELECT array_agg(k ORDER BY k) INTO v_changed_columns FROM jsonb_object_keys(v_row) AS keys(k);
    ELSIF TG_OP = 'DELETE' THEN
        v_row := to_jsonb(OLD);
        SELECT array_agg(k ORDER BY k) INTO v_changed_columns FROM jsonb_object_keys(v_row) AS keys(k);
    ELSE
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_row := v_new;
        SELECT array_agg(k ORDER BY k)
          INTO v_changed_columns
        FROM (
            SELECT key AS k FROM jsonb_object_keys(v_old) AS old_keys(key)
            UNION
            SELECT key AS k FROM jsonb_object_keys(v_new) AS new_keys(key)
        ) AS all_keys
        WHERE v_old -> k IS DISTINCT FROM v_new -> k;
        IF v_changed_columns IS NULL THEN
            RETURN NEW;
        END IF;
    END IF;

    v_resource_id := (v_row ->> TG_ARGV[0])::uuid;
    INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
    VALUES (
        v_actor_id,
        lower(TG_OP),
        TG_TABLE_NAME,
        v_resource_id,
        jsonb_build_object('changed_columns', to_jsonb(v_changed_columns), 'source', 'database_trigger')
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS places_audit_admin_change ON places;
CREATE TRIGGER places_audit_admin_change
AFTER INSERT OR UPDATE OR DELETE ON places
FOR EACH ROW EXECUTE FUNCTION audit_admin_change('place_id');

DROP TRIGGER IF EXISTS categories_audit_admin_change ON categories;
CREATE TRIGGER categories_audit_admin_change
AFTER INSERT OR UPDATE OR DELETE ON categories
FOR EACH ROW EXECUTE FUNCTION audit_admin_change('category_id');

DROP TRIGGER IF EXISTS hours_profiles_audit_admin_change ON place_hours_profiles;
CREATE TRIGGER hours_profiles_audit_admin_change
AFTER INSERT OR UPDATE OR DELETE ON place_hours_profiles
FOR EACH ROW EXECUTE FUNCTION audit_admin_change('place_id');

DROP TRIGGER IF EXISTS weekly_hours_audit_admin_change ON place_weekly_hours;
CREATE TRIGGER weekly_hours_audit_admin_change
AFTER INSERT OR UPDATE OR DELETE ON place_weekly_hours
FOR EACH ROW EXECUTE FUNCTION audit_admin_change('place_id');

DROP TRIGGER IF EXISTS reviews_audit_admin_moderation ON reviews;
CREATE TRIGGER reviews_audit_admin_moderation
AFTER UPDATE OF moderation_status ON reviews
FOR EACH ROW WHEN (OLD.moderation_status IS DISTINCT FROM NEW.moderation_status)
EXECUTE FUNCTION audit_admin_change('review_id');

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS places_set_updated_at ON places;
CREATE TRIGGER places_set_updated_at BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS hours_profiles_set_updated_at ON place_hours_profiles;
CREATE TRIGGER hours_profiles_set_updated_at BEFORE UPDATE ON place_hours_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS reviews_set_updated_at ON reviews;
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;


-- Authentication additions for the existing users table. Does not alter or
-- remove existing users; NULL password hashes remain valid.
BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_password_hash_argon2id;
DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_password_hash_supported'
          AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_password_hash_supported
            CHECK (
                password_hash IS NULL
                OR password_hash ~ '^\$argon2id\$v=19\$'
                OR password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
            );
    END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT auth_sessions_expiry_after_creation CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_expiry_idx
    ON auth_sessions (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_active_expiry_idx
    ON auth_sessions (expires_at)
    WHERE revoked_at IS NULL;

COMMIT;


-- Clearly synthetic, deterministic demonstration dataset. Safe to rerun: every
-- insert uses stable UUIDs and ON CONFLICT DO NOTHING. Never use as real data.
BEGIN;

INSERT INTO users (user_id, email, display_name, password_hash, role) VALUES
('00000000-0000-4000-8000-000000000001', 'demo.admin@example.test', 'Demo Administrator', NULL, 'admin'),
('00000000-0000-4000-8000-000000000002', 'demo.alex@example.test', 'Demo Alex', NULL, 'user'),
('00000000-0000-4000-8000-000000000003', 'demo.blair@example.test', 'Demo Blair', NULL, 'user'),
('00000000-0000-4000-8000-000000000004', 'demo.casey@example.test', 'Demo Casey', NULL, 'user'),
('00000000-0000-4000-8000-000000000005', 'demo.dev@example.test', 'Demo Dev', NULL, 'user')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO categories (category_id, name, slug, description, parent_category_id) VALUES
('10000000-0000-4000-8000-000000000001', 'Food and Drink', 'food-drink', 'Synthetic top-level food and drink category.', NULL),
('10000000-0000-4000-8000-000000000002', 'Restaurant', 'restaurant', 'Synthetic restaurant category.', '10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000003', 'Cafe', 'cafe', 'Synthetic cafe category.', '10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000004', 'Healthcare', 'healthcare', 'Synthetic healthcare category.', NULL),
('10000000-0000-4000-8000-000000000005', 'Hospital', 'hospital', 'Synthetic hospital category.', '10000000-0000-4000-8000-000000000004'),
('10000000-0000-4000-8000-000000000006', 'Shopping', 'shopping', 'Synthetic shopping category.', NULL),
('10000000-0000-4000-8000-000000000007', 'Grocery', 'grocery', 'Synthetic grocery category.', '10000000-0000-4000-8000-000000000006'),
('10000000-0000-4000-8000-000000000008', 'Parks', 'parks', 'Synthetic park category.', NULL)
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO places
    (place_id, name, description, address_line1, locality, region, postal_code,
     country_code, location, time_zone, is_active, created_by_user_id)
VALUES
('20000000-0000-4000-8000-000000000001', 'Demo Central Bistro', 'Synthetic demonstration restaurant near the map search origin.', '10 Example Road', 'Bengaluru', 'Karnataka', '560001', 'IN', checked_geography_point(77.5946, 12.9716), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002', 'Demo Corner Cafe', 'Synthetic cafe with sample coffee reviews.', '12 Demo Lane', 'Bengaluru', 'Karnataka', '560001', 'IN', checked_geography_point(77.5960, 12.9728), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000003', 'Demo City Hospital', 'Synthetic healthcare point for spatial filters.', '15 Sample Avenue', 'Bengaluru', 'Karnataka', '560001', 'IN', checked_geography_point(77.5990, 12.9745), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000004', 'Demo Green Park', 'Synthetic park with an explicitly closed weekly schedule.', '20 Test Street', 'Bengaluru', 'Karnataka', '560002', 'IN', checked_geography_point(77.5900, 12.9760), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000005', 'Demo Market Cafe', 'Synthetic cafe and restaurant category example.', '22 Mock Road', 'Bengaluru', 'Karnataka', '560002', 'IN', checked_geography_point(77.5880, 12.9690), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000006', 'Demo North Grocery', 'Synthetic grocery store.', '25 Fixture Street', 'Bengaluru', 'Karnataka', '560003', 'IN', checked_geography_point(77.6020, 12.9820), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000007', 'Demo South Kitchen', 'Synthetic restaurant.', '27 Fixture Street', 'Bengaluru', 'Karnataka', '560004', 'IN', checked_geography_point(77.6000, 12.9600), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000008', 'Demo East Cafe', 'Synthetic cafe.', '29 Fixture Street', 'Bengaluru', 'Karnataka', '560005', 'IN', checked_geography_point(77.6200, 12.9750), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000009', 'Demo West Clinic', 'Synthetic hospital/healthcare example.', '31 Fixture Street', 'Bengaluru', 'Karnataka', '560006', 'IN', checked_geography_point(77.5700, 12.9750), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000010', 'Demo Lake Restaurant', 'Synthetic restaurant.', '33 Fixture Street', 'Bengaluru', 'Karnataka', '560007', 'IN', checked_geography_point(77.6100, 12.9900), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000011', 'Demo Museum Cafe', 'Synthetic cafe.', '35 Fixture Street', 'Bengaluru', 'Karnataka', '560008', 'IN', checked_geography_point(77.5800, 12.9900), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000012', 'Demo South Hospital', 'Synthetic hospital.', '37 Fixture Street', 'Bengaluru', 'Karnataka', '560009', 'IN', checked_geography_point(77.6050, 12.9450), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000013', 'Demo Central Grocer', 'Synthetic grocery.', '39 Fixture Street', 'Bengaluru', 'Karnataka', '560010', 'IN', checked_geography_point(77.6250, 12.9550), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000014', 'Demo Garden Park', 'Synthetic park.', '41 Fixture Street', 'Bengaluru', 'Karnataka', '560011', 'IN', checked_geography_point(77.5650, 12.9600), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000015', 'Demo Tech Restaurant', 'Synthetic restaurant.', '43 Fixture Street', 'Bengaluru', 'Karnataka', '560012', 'IN', checked_geography_point(77.6500, 12.9800), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000016', 'Demo Valley Cafe', 'Synthetic cafe.', '45 Fixture Street', 'Bengaluru', 'Karnataka', '560013', 'IN', checked_geography_point(77.5400, 12.9800), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000017', 'Demo Outer Clinic', 'Synthetic hospital.', '47 Fixture Street', 'Bengaluru', 'Karnataka', '560014', 'IN', checked_geography_point(77.6300, 12.9300), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000018', 'Demo Outer Grocery', 'Synthetic grocery.', '49 Fixture Street', 'Bengaluru', 'Karnataka', '560015', 'IN', checked_geography_point(77.5200, 12.9500), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000019', 'Demo Outer Park', 'Synthetic park.', '51 Fixture Street', 'Bengaluru', 'Karnataka', '560016', 'IN', checked_geography_point(77.6800, 12.9200), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000020', 'Demo Distant Bistro', 'Synthetic farther restaurant for radius boundary tests.', '53 Fixture Street', 'Bengaluru', 'Karnataka', '560017', 'IN', checked_geography_point(77.7000, 13.0200), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001')
ON CONFLICT (place_id) DO NOTHING;

INSERT INTO place_categories (place_id, category_id) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000008'),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000007'),
('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000007'),
('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000008'),
('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000007'),
('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000008'),
('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000002')
ON CONFLICT (place_id, category_id) DO NOTHING;

INSERT INTO place_hours_profiles (place_id, verified_at) VALUES
('20000000-0000-4000-8000-000000000001', now()),
('20000000-0000-4000-8000-000000000002', now()),
('20000000-0000-4000-8000-000000000004', now())
ON CONFLICT (place_id) DO NOTHING;

INSERT INTO place_weekly_hours (place_id, iso_weekday, period_no, is_closed, opens_at, closes_at)
SELECT schedule.place_id,
       day_no::smallint,
       1,
       coalesce(schedule.closed_all OR day_no = schedule.closed_day, false),
       CASE WHEN schedule.closed_all OR day_no = schedule.closed_day THEN NULL ELSE schedule.opens_at END,
       CASE WHEN schedule.closed_all OR day_no = schedule.closed_day THEN NULL ELSE schedule.closes_at END
FROM (VALUES
    ('20000000-0000-4000-8000-000000000001'::uuid, NULL::integer, false, '09:00'::time, '22:00'::time),
    ('20000000-0000-4000-8000-000000000002'::uuid, 7, false, '08:00'::time, '18:00'::time),
    ('20000000-0000-4000-8000-000000000004'::uuid, NULL::integer, true, NULL::time, NULL::time)
) AS schedule(place_id, closed_day, closed_all, opens_at, closes_at)
CROSS JOIN generate_series(1, 7) AS days(day_no)
ON CONFLICT (place_id, iso_weekday, period_no) DO NOTHING;

INSERT INTO reviews (review_id, place_id, author_user_id, rating, body, moderation_status, created_at) VALUES
('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 4.5, 'Synthetic review: friendly service and excellent masala dosa.', 'published', '2026-10-01T09:00:00Z'),
('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: tasty lunch and quick service.', 'published', '2026-10-02T09:00:00Z'),
('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 5.0, NULL, 'published', '2026-10-03T09:00:00Z'),
('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 4.5, 'Synthetic review: rich coffee and quiet seating.', 'published', '2026-10-04T09:00:00Z'),
('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', 3.5, 'Synthetic review: coffee was good but the queue was long.', 'published', '2026-10-05T09:00:00Z'),
('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: helpful hospital staff and clean rooms.', 'published', '2026-10-06T09:00:00Z'),
('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 4.5, NULL, 'published', '2026-10-07T09:00:00Z'),
('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 4.0, 'Synthetic review: peaceful green park and shaded paths.', 'published', '2026-10-08T09:00:00Z'),
('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', 4.0, 'Synthetic review: fresh pastries and friendly cafe staff.', 'published', '2026-10-09T09:00:00Z'),
('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', 4.5, NULL, 'published', '2026-10-10T09:00:00Z'),
('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000004', 3.5, 'Synthetic review: useful grocery selection and fair prices.', 'published', '2026-10-11T09:00:00Z'),
('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000005', 4.5, 'Synthetic review: excellent dinner and warm service.', 'published', '2026-10-12T09:00:00Z'),
('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000002', 3.0, 'Synthetic review: average coffee and limited seating.', 'published', '2026-10-13T09:00:00Z'),
('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: attentive clinic team.', 'published', '2026-10-14T09:00:00Z'),
('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000004', 5.0, 'Synthetic review: delicious dinner and quick service.', 'published', '2026-10-15T09:00:00Z'),
('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000005', 4.0, 'Synthetic review: smooth coffee and calm atmosphere.', 'published', '2026-10-16T09:00:00Z'),
('30000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 3.5, NULL, 'published', '2026-10-17T09:00:00Z'),
('30000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000003', 4.5, 'Synthetic review: fresh produce and helpful checkout.', 'published', '2026-10-18T09:00:00Z'),
('30000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000004', 4.0, 'Synthetic review: green garden with clean paths.', 'published', '2026-10-19T09:00:00Z'),
('30000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000005', 4.5, 'Synthetic review: flavorful meal and excellent service.', 'published', '2026-10-20T09:00:00Z'),
('30000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000002', 3.5, 'Synthetic review: good espresso and comfortable chairs.', 'published', '2026-10-21T09:00:00Z'),
('30000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: professional healthcare staff.', 'published', '2026-10-22T09:00:00Z'),
('30000000-0000-4000-8000-000000000023', '20000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000004', 4.0, 'Synthetic review: well stocked grocery shelves.', 'published', '2026-10-23T09:00:00Z'),
('30000000-0000-4000-8000-000000000024', '20000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000005', 5.0, 'Synthetic review: lovely park and quiet walking paths.', 'published', '2026-10-24T09:00:00Z'),
('30000000-0000-4000-8000-000000000025', '20000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000002', 4.0, 'Synthetic review: tasty food though farther from the center.', 'published', '2026-10-25T09:00:00Z'),
('30000000-0000-4000-8000-000000000026', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 3.5, 'Synthetic review: good vegetarian options.', 'published', '2026-10-26T09:00:00Z'),
('30000000-0000-4000-8000-000000000027', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004', 5.0, 'Synthetic review: excellent filter coffee.', 'published', '2026-10-27T09:00:00Z'),
('30000000-0000-4000-8000-000000000028', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005', 3.5, 'Synthetic review: clean hospital and helpful reception.', 'published', '2026-10-28T09:00:00Z'),
('30000000-0000-4000-8000-000000000029', '20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 4.5, NULL, 'published', '2026-10-29T09:00:00Z'),
('30000000-0000-4000-8000-000000000030', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 4.0, 'Synthetic review: nice bakery pastries and coffee.', 'published', '2026-10-30T09:00:00Z'),
('30000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 4.5, 'Synthetic review: good selection and friendly staff.', 'published', '2026-10-31T09:00:00Z'),
('30000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000004', 4.0, 'Synthetic review: tasty breakfast and fast service.', 'published', '2026-11-01T09:00:00Z')
ON CONFLICT (review_id) DO NOTHING;

INSERT INTO check_ins (check_in_id, user_id, place_id, checked_in_at, source) VALUES
('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '2026-10-20T09:00:00Z', 'manual'),
('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '2026-10-21T09:00:00Z', 'manual'),
('40000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', '2026-10-22T09:00:00Z', 'trajectory'),
('40000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', '2026-10-23T09:00:00Z', 'manual'),
('40000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', '2026-10-24T09:00:00Z', 'other')
ON CONFLICT (check_in_id) DO NOTHING;

COMMIT;
