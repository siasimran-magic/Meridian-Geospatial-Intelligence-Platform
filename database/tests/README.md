# Database verification

Run these only against the local development database. They use synthetic fixture rows from `database/seeds/001_demo_data.sql`; verification-generated transaction rows are cleaned up. The audit-trigger test runs inside a transaction and rolls back.

`verify.sql` uses `ON_ERROR_STOP` and raises on a failed assertion. It checks schema objects, constraints, seed counts, spatial/category/rating filtering, distance, known/unknown/closed hours, view results, full-text search, admin auditing, and commit/rollback behavior. Its final `EXPLAIN (ANALYZE, BUFFERS)` uses `SET enable_seqscan=off` only to make the GiST access path demonstrable on the small demo dataset; this is not a production planner recommendation.
