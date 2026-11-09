import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type CategoryRow = { category_id: string; name: string; slug: string };

export async function GET() {
  try {
    const result = await query<CategoryRow>(`
      SELECT DISTINCT c.category_id, c.name, c.slug
      FROM categories c
      JOIN place_categories pc ON pc.category_id = c.category_id
      JOIN places p ON p.place_id = pc.place_id
      WHERE p.is_active
      ORDER BY c.name
    `);

    return NextResponse.json({
      categories: result.rows.map((row) => ({
        categoryId: row.category_id,
        name: row.name,
        slug: row.slug,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable while loading categories." },
      { status: 503 },
    );
  }
}
