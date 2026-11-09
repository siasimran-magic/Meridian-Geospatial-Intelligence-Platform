import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, isSameOriginRequest, sessionCookieOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDatabase } from "@/lib/mongodb";

type UserRow = { user_id: string; email: string; display_name: string; role: "user" | "admin"; password_hash: string | null };

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
    return NextResponse.json({ error: "Provide an email and password." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  // 1. Try PostgreSQL first
  try {
    const found = await query<UserRow>(
      `SELECT user_id, email, display_name, role, password_hash
       FROM users WHERE lower(email) = $1 AND is_active`,
      [email],
    );
    const user = found.rows[0];
    const valid = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !valid) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const session = await createSession(user.user_id);

    const response = NextResponse.json({ user: {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    } });
    response.cookies.set("geointel_session", session.value, {
      ...sessionCookieOptions(),
      expires: session.expiresAt,
    });
    return response;
  } catch {
    // 2. Fallback to MongoDB when PostgreSQL is offline
    try {
      const db = await getDatabase();
      const user = await db.collection("users").findOne({ email, is_active: { $ne: false } });
      const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
      if (!user || !valid) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
      const session = await createSession(user.userId);

      const response = NextResponse.json({ user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      } });
      response.cookies.set("geointel_session", session.value, {
        ...sessionCookieOptions(),
        expires: session.expiresAt,
      });
      return response;
    } catch (err) {
      console.error("Login fallback error:", err);
      return NextResponse.json({ error: "Login is unavailable. Please try again." }, { status: 503 });
    }
  }
}
