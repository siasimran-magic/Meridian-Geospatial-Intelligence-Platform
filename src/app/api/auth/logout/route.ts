import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser, isSameOriginRequest, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  try {
    const user = await getCurrentUser();
    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    const sessionId = cookie?.split(".")[0];
    if (user && sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)) {
      try {
        await query("UPDATE auth_sessions SET revoked_at = now() WHERE session_id = $1 AND revoked_at IS NULL", [sessionId]);
      } catch {
        // Fallback to MongoDB session revocation
        const db = await getDatabase();
        await db.collection("auth_sessions").updateOne(
          { session_id: sessionId },
          { $set: { revoked_at: new Date() } }
        );
      }
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
    return response;
  } catch {
    return NextResponse.json({ error: "Logout is unavailable. Please try again." }, { status: 503 });
  }
}
