import { NextResponse } from "next/server";
import { AuthorizationError, requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

type Counts = { users: string; places: string; published_reviews: string };

export async function GET() {
  try {
    await requireRole("admin");
    const result = await query<Counts>(`
      SELECT
        (SELECT count(*) FROM users WHERE is_active)::text AS users,
        (SELECT count(*) FROM places WHERE is_active)::text AS places,
        (SELECT count(*) FROM reviews WHERE moderation_status = 'published')::text AS published_reviews
    `);
    return NextResponse.json({ overview: result.rows[0] });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Administrative overview is unavailable." }, { status: 503 });
  }
}
