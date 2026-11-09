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
