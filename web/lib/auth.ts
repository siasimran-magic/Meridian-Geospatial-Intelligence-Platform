import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import { query } from "@/lib/db";

export const SESSION_COOKIE = "geointel_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = {
  userId: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
};

type SessionRow = AuthUser & { expires_at: Date | string };

function sessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 bytes.");
  }
  return secret;
}

function signature(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function sessionCookieValue(sessionId: string, expiresAt: number): string {
  const payload = `${sessionId}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(userId: string, client?: PoolClient): Promise<{ value: string; expiresAt: Date }> {
  const sessionId = randomUUID();
  // Store exactly the same second precision that is signed into the cookie.
  const expiresAt = new Date((Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS) * 1000);
  const value = sessionCookieValue(sessionId, Math.floor(expiresAt.getTime() / 1000));
  const sql = "INSERT INTO auth_sessions (session_id, user_id, expires_at) VALUES ($1, $2, $3)";
  if (client) await client.query(sql, [sessionId, userId, expiresAt]);
  else await query(sql, [sessionId, userId, expiresAt]);
  return {
    value,
    expiresAt,
  };
}

function decodeCookie(value: string | undefined): { sessionId: string; expiresAt: Date } | null {
  if (!value) return null;
  const match = /^([0-9a-f-]{36})\.(\d{10})\.([A-Za-z0-9_-]{43})$/i.exec(value);
  if (!match) return null;
  const [, sessionId, rawExpiry, suppliedSignature] = match;
  const payload = `${sessionId}.${rawExpiry}`;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  const expirySeconds = Number(rawExpiry);
  if (!Number.isSafeInteger(expirySeconds) || expirySeconds * 1000 <= Date.now()) return null;
  return { sessionId, expiresAt: new Date(expirySeconds * 1000) };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieValue = (await cookies()).get(SESSION_COOKIE)?.value;
  const decoded = decodeCookie(cookieValue);
  if (!decoded) return null;
  const result = await query<SessionRow>(
    `SELECT u.user_id AS "userId", u.email, u.display_name AS "displayName", u.role,
            s.expires_at
     FROM auth_sessions s
     JOIN users u ON u.user_id = s.user_id
     WHERE s.session_id = $1
       AND s.expires_at = $2
       AND s.expires_at > now()
       AND s.revoked_at IS NULL
       AND u.is_active`,
    [decoded.sessionId, decoded.expiresAt],
  );
  return result.rows[0] ?? null;
}

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required." : "Insufficient permissions.");
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError(401);
  return user;
}

export async function requireRole(role: AuthUser["role"]): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== role) throw new AuthorizationError(403);
  return user;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || new URL(request.url).protocol.replace(/:$/, "");
    return Boolean(host) && originUrl.origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

