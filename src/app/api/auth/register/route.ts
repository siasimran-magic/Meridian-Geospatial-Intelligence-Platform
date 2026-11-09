import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, isSameOriginRequest, sessionCookieOptions } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { getDatabase } from "@/lib/mongodb";

const BCRYPT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Provide a display name, email, and password." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (displayName.length < 2 || displayName.length > 80) {
    return NextResponse.json({ error: "Display name must be 2 to 80 characters." }, { status: 400 });
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json({ error: "Password must be at least 12 characters and no more than 72 UTF-8 bytes." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 1. Try PostgreSQL first
  try {
    const result = await withTransaction(async (client) => {
      const inserted = await client.query<{ user_id: string }>(
        `INSERT INTO users (email, display_name, password_hash, role)
         VALUES ($1, $2, $3, 'user')
         RETURNING user_id`,
        [email, displayName, passwordHash],
      );
      const session = await createSession(inserted.rows[0].user_id, client);
      return { userId: inserted.rows[0].user_id, session };
    });
    const response = NextResponse.json({ user: { userId: result.userId, email, displayName, role: "user" } }, { status: 201 });
    response.cookies.set("geointel_session", result.session.value, {
      ...sessionCookieOptions(),
      expires: result.session.expiresAt,
    });
    return response;
  } catch (pgError: unknown) {
    if (typeof pgError === "object" && pgError !== null && "code" in pgError && pgError.code === "23505") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    // 2. Fallback to MongoDB when PostgreSQL service is unavailable
    try {
      const db = await getDatabase();
      const existing = await db.collection("users").findOne({ email });
      if (existing) {
        return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
      }

      const newUserId = randomUUID();
      await db.collection("users").insertOne({
        userId: newUserId,
        email,
        displayName,
        passwordHash,
        role: "user",
        is_active: true,
        createdAt: new Date(),
      });

      const session = await createSession(newUserId);
      const response = NextResponse.json({ user: { userId: newUserId, email, displayName, role: "user" } }, { status: 201 });
      response.cookies.set("geointel_session", session.value, {
        ...sessionCookieOptions(),
        expires: session.expiresAt,
      });
      return response;
    } catch (mongoError) {
      console.error("Registration error:", mongoError);
      return NextResponse.json({ error: "Registration is unavailable. Please try again." }, { status: 503 });
    }
  }
}
