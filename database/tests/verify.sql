\set ON_ERROR_STOP on

-- Run after migrations and seeds. Assertions fail with a non-zero psql exit.
DO $$
DECLARE
    v_table_count integer;
    v_fk_count integer;
    v_pk_count integer;
BEGIN
    SELECT count(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
      AND table_name IN ('users','categories','places','place_categories','place_hours_profiles',
                         'place_weekly_hours','reviews','review_embeddings','check_ins','audit_logs');
    IF v_table_count <> 10 THEN RAISE EXCEPTION 'Expected 10 application tables, found %', v_table_count; END IF;

    SELECT count(*) INTO v_pk_count
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = current_schema() AND c.contype = 'p'
      AND t.relname IN ('users','categories','places','place_categories','place_hours_profiles',
                        'place_weekly_hours','reviews','review_embeddings','check_ins','audit_logs');
    IF v_pk_count <> 10 THEN RAISE EXCEPTION 'Expected 10 primary keys, found %', v_pk_count; END IF;

    SELECT count(*) INTO v_fk_count
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = current_schema() AND c.contype = 'f';
    IF v_fk_count < 10 THEN RAISE EXCEPTION 'Expected at least 10 foreign keys, found %', v_fk_count; END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'places_location_gist_idx') THEN
        RAISE EXCEPTION 'Missing PostGIS GiST index';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'reviews_published_fts_gin_idx') THEN
        RAISE EXCEPTION 'Missing review full-text GIN index';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'review_embeddings_hnsw_cosine_idx') THEN
        RAISE EXCEPTION 'Missing pgvector HNSW index';
    END IF;
    IF (SELECT count(*) FROM places) < 20 THEN RAISE EXCEPTION 'Expected at least 20 seeded places'; END IF;
    IF (SELECT count(*) FROM reviews) < 30 THEN RAISE EXCEPTION 'Expected at least 30 seeded reviews'; END IF;
    IF (SELECT count(*) FROM users WHERE role = 'admin') < 1 OR (SELECT count(*) FROM users WHERE role = 'user') < 1 THEN
        RAISE EXCEPTION 'Expected seeded admin and user roles';
    END IF;
    IF (SELECT count(*) FROM check_ins) < 3 THEN RAISE EXCEPTION 'Expected several seeded check-ins'; END IF;
    IF NOT EXISTS (SELECT 1 FROM reviews WHERE body IS NULL) THEN RAISE EXCEPTION 'Expected rating-only seed reviews'; END IF;
END;
$$;
\echo 'PASS: tables, foreign keys, indexes, and seed counts'

DO $$
BEGIN
    BEGIN
        INSERT INTO reviews (place_id, rating, body)
        VALUES ('20000000-0000-4000-8000-000000000001', 4.3, 'constraint test');
        RAISE EXCEPTION 'Expected half-step rating validation to reject 4.3';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: invalid 4.3 rating rejected';
    END;

    BEGIN
        PERFORM checked_geography_point(181, 10);
        RAISE EXCEPTION 'Expected invalid longitude to be rejected';
    EXCEPTION WHEN invalid_parameter_value THEN
        RAISE NOTICE 'PASS: invalid longitude rejected before geography normalization';
    END;
END;
$$;

DO $$
DECLARE
    v_first_id uuid := gen_random_uuid();
    v_second_id uuid := gen_random_uuid();
BEGIN
    INSERT INTO users (user_id, email, display_name) VALUES (v_first_id, 'constraint-test@example.test', 'Constraint Test');
    BEGIN
        INSERT INTO users (user_id, email, display_name) VALUES (v_second_id, 'CONSTRAINT-TEST@example.test', 'Duplicate Constraint Test');
        RAISE EXCEPTION 'Expected case-insensitive duplicate email to be rejected';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: case-insensitive unique email enforced';
    END;
    DELETE FROM users WHERE user_id = v_first_id;
END;
$$;

DO $$
DECLARE
    v_place_id uuid := '20000000-0000-4000-8000-000000000001';
    v_unknown_id uuid := '20000000-0000-4000-8000-000000000003';
    v_closed_id uuid := '20000000-0000-4000-8000-000000000004';
    v_nearby_count bigint;
    v_distance double precision;
BEGIN
    SELECT count(*) INTO v_nearby_count
    FROM nearby_places(77.5946, 12.9716, 1000, 'restaurant', 4.0);
    IF v_nearby_count = 0 THEN RAISE EXCEPTION 'Expected nearby restaurant with rating >= 4'; END IF;

    SELECT distance_m INTO v_distance
    FROM nearby_places(77.5946, 12.9716, 100, NULL, NULL)
    WHERE nearby_places.place_id = v_place_id;
    IF v_distance IS NULL OR v_distance > 0.1 THEN RAISE EXCEPTION 'Unexpected distance for origin place: %', v_distance; END IF;

    IF place_is_open(v_place_id, '2026-11-02 10:00:00+05:30'::timestamptz) IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Expected known Monday hours to be open';
    END IF;
    IF place_is_open(v_closed_id, '2026-11-02 10:00:00+05:30'::timestamptz) IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'Expected explicitly closed place to be closed';
    END IF;
    IF place_is_open(v_unknown_id, '2026-11-02 10:00:00+05:30'::timestamptz) IS NOT NULL THEN
        RAISE EXCEPTION 'Expected missing hours to return unknown (NULL)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM published_place_rating_summary WHERE place_id = v_place_id AND review_count = 4) THEN
        RAISE EXCEPTION 'Published rating view did not return expected place summary';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM reviews WHERE search_document @@ websearch_to_tsquery('english', 'masala dosa')) THEN
        RAISE EXCEPTION 'Full-text query did not find seeded review';
    END IF;
END;
$$;
\echo 'PASS: spatial radius/rating/category, distance, opening-hours states, view, and full-text search'

-- Administrative audit trigger is tested inside a transaction and rolled back.
BEGIN;
SELECT set_config('app.user_id', '00000000-0000-4000-8000-000000000001', true);
UPDATE places
SET description = description || ' [audit-trigger-test]'
WHERE place_id = '20000000-0000-4000-8000-000000000001';
UPDATE place_weekly_hours
SET opens_at = opens_at + interval '1 minute'
WHERE place_id = '20000000-0000-4000-8000-000000000001'
  AND iso_weekday = 1 AND period_no = 1;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM audit_logs
        WHERE resource_type = 'places'
          AND resource_id = '20000000-0000-4000-8000-000000000001'
          AND actor_user_id = '00000000-0000-4000-8000-000000000001'
          AND action = 'update'
          AND (details -> 'changed_columns') ? 'description'
    ) THEN RAISE EXCEPTION 'Admin place update was not written to audit_logs'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM audit_logs
        WHERE resource_type = 'place_weekly_hours'
          AND resource_id = '20000000-0000-4000-8000-000000000001'
          AND actor_user_id = '00000000-0000-4000-8000-000000000001'
          AND action = 'update'
          AND (details -> 'changed_columns') ? 'opens_at'
    ) THEN RAISE EXCEPTION 'Admin weekly-hours update was not written to audit_logs'; END IF;
END;
$$;
\echo 'PASS: admin place and weekly-hours changes recorded in audit_logs'
ROLLBACK;

-- Commit test: a review and its audit event persist together, are checked, then cleaned up.
SELECT gen_random_uuid() AS committed_review_id \gset
SELECT gen_random_uuid() AS committed_request_id \gset
BEGIN;
INSERT INTO reviews (review_id, place_id, author_user_id, rating, body)
VALUES (:'committed_review_id'::uuid, '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 4.5, 'transaction commit verification');
INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, request_id, details)
VALUES ('00000000-0000-4000-8000-000000000002', 'review_create', 'reviews', :'committed_review_id'::uuid,
        :'committed_request_id'::uuid, '{"test":"commit"}'::jsonb);
COMMIT;
SELECT (count(*) = 1)::text AS commit_ok FROM reviews WHERE review_id = :'committed_review_id'::uuid \gset
\if :commit_ok
    \echo 'PASS: multi-step review operation committed review and audit event'
\else
    \quit 1
\endif
SELECT exists (
    SELECT 1 FROM audit_logs
    WHERE resource_id = :'committed_review_id'::uuid AND details ->> 'test' = 'commit'
)::text AS audit_commit_ok \gset
\if :audit_commit_ok
    \echo 'PASS: audit event committed with its review'
\else
    \quit 1
\endif
DELETE FROM audit_logs WHERE request_id = :'committed_request_id'::uuid;
DELETE FROM reviews WHERE review_id = :'committed_review_id'::uuid;

-- A failing step rolls the earlier review and audit writes back to the savepoint block.
DO $$
DECLARE
    v_review_id uuid := gen_random_uuid();
    v_request_id uuid := gen_random_uuid();
BEGIN
    BEGIN
        INSERT INTO reviews (review_id, place_id, author_user_id, rating, body)
        VALUES (v_review_id, '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 4.0, 'rollback verification');
        INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, request_id, details)
        VALUES ('00000000-0000-4000-8000-000000000002', 'review_create', 'reviews', v_review_id, v_request_id, '{"test":"rollback"}'::jsonb);
        INSERT INTO reviews (place_id, rating, body)
        VALUES ('20000000-0000-4000-8000-000000000001', 5.3, 'this invalid review forces rollback');
        RAISE EXCEPTION 'Expected invalid rating to abort the operation';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: failed review operation rolled back to subtransaction boundary';
    END;
    IF EXISTS (SELECT 1 FROM reviews WHERE review_id = v_review_id)
       OR EXISTS (SELECT 1 FROM audit_logs WHERE request_id = v_request_id) THEN
        RAISE EXCEPTION 'Review or audit row survived rollback';
    END IF;
END;
$$;
\echo 'PASS: rollback removed both review and audit writes'

-- Reproducible plan evidence. With only 20 demo rows PostgreSQL normally prefers
-- a sequential scan; disabling it here asks the planner to show the GiST path.
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.place_id, ST_Distance(p.location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716),4326)::geography) AS distance_m
FROM places p
WHERE p.is_active
  AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(77.5946, 12.9716),4326)::geography, 1000)
ORDER BY distance_m;
RESET enable_seqscan;
