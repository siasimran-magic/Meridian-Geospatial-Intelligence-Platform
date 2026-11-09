# Authentication

GeoIntel uses PostgreSQL `users` as the account store. Registration creates an active `user` account with a normalized lowercase email and bcrypt password hash. Existing seeded users and their nullable password hashes are preserved; passwordless demo accounts cannot sign in until a separate, explicit credential-management flow exists.

## Configure and migrate

Create `web/.env.local` from `web/.env.example`, set `DATABASE_URL`, and replace `AUTH_SESSION_SECRET` with at least 32 random bytes. For example:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Apply the additive authentication migration from the repository root:

```powershell
Get-Content -Raw .\database\migrations\002_authentication.sql | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U geointel_dev -d geointel
```

The migration keeps existing `users` rows and roles, accepts bcrypt or legacy Argon2id hashes, and creates `auth_sessions` for revocable sessions. It does not modify the initial migration or reset database storage.

## API

- `POST /api/auth/register` accepts `{ "displayName", "email", "password" }`. It normalizes email, enforces a 12-character minimum and bcrypt's 72-byte maximum, inserts the user and session in one transaction, sets the session cookie, and returns `201`. Duplicate email returns `409`.
- `POST /api/auth/login` accepts `{ "email", "password" }`. Invalid or passwordless demo accounts receive the same `401` response.
- `POST /api/auth/logout` revokes the active database session and clears the cookie.
- `GET /api/auth/me` returns the safe user profile, or `401` when signed out.

Mutating auth requests require a same-origin `Origin` header. SQL is parameterized. Password hashes, cookie values, and session secrets are not returned. The seven-day `geointel_session` cookie is HMAC-SHA256 signed, HttpOnly, SameSite=Lax, path `/`, and Secure in production. Each request validates its signature, expiry, active session row, and active account on the server.

## Authorization

`getCurrentUser()`, `requireUser()`, and `requireRole("admin" | "user")` in `web/lib/auth.ts` are server-only utilities for route handlers and server code. `requireUser()` fails with 401 and `requireRole()` fails with 403 for an authenticated user with the wrong role. The read-only `/api/admin/overview` endpoint demonstrates admin-only authorization; category, nearby-place, and place-detail routes remain public read-only discovery APIs. Never trust a role supplied by the browser.

## Pages

- `/register` creates an account and signs it in.
- `/login` signs in an existing account.
- The spatial explorer header shows the current user's display name and a sign-out action.

Production deployments must set a unique high-entropy session secret, serve HTTPS, and use least-privilege database credentials. Rate limiting, email verification, password reset, MFA, and automated session cleanup are not included in this minimal local implementation.
