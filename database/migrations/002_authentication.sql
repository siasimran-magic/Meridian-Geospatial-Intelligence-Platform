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
