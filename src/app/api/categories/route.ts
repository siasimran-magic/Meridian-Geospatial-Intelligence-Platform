import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type CategoryRow = { category_id: string; name: string; slug: string };

const FALLBACK_CATEGORIES = [
  { categoryId: "10000000-0000-4000-8000-000000000001", name: "Food & Drink", slug: "food-drink" },
  { categoryId: "10000000-0000-4000-8000-000000000002", name: "Restaurant", slug: "restaurant" },
  { categoryId: "10000000-0000-4000-8000-000000000003", name: "Cafe", slug: "cafe" },
  { categoryId: "10000000-0000-4000-8000-000000000004", name: "Healthcare", slug: "healthcare" },
  { categoryId: "10000000-0000-4000-8000-000000000005", name: "Hospital", slug: "hospital" },
  { categoryId: "10000000-0000-4000-8000-000000000006", name: "Shopping", slug: "shopping" },
  { categoryId: "10000000-0000-4000-8000-000000000007", name: "Grocery", slug: "grocery" },
  { categoryId: "10000000-0000-4000-8000-000000000008", name: "Parks", slug: "parks" },
];

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
    // When PostgreSQL is offline, return canonical categories
    return NextResponse.json({
      categories: FALLBACK_CATEGORIES,
    });
  }
}
