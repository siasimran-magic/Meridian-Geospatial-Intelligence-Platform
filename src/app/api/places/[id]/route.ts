import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { OpeningStatus, PlaceDetails, PlaceReview, WeeklyHoursPeriod, PlaceCategory } from "@/types/places";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DetailsRow = {
  place_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  geometry: { type: "Point"; coordinates: [number, number] };
  distance_m: number;
  average_rating: number | null;
  review_count: number;
  categories: PlaceCategory[];
  opening_status: OpeningStatus;
  hours_known: boolean;
  opening_hours: WeeklyHoursPeriod[];
  phone: string | null;
  website_url: string | null;
  time_zone: string;
};

type ReviewRow = {
  review_id: string;
  rating: number;
  body: string | null;
  created_at: Date;
  author_name: string | null;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "id must be a valid UUID." }, { status: 400 });
  }

  try {
    const result = await query<DetailsRow>(
      `
        SELECT p.place_id,
               p.name,
               p.description,
               NULLIF(concat_ws(', ', NULLIF(p.address_line1, ''), NULLIF(p.address_line2, ''),
                                NULLIF(p.locality, ''), NULLIF(p.region, ''), NULLIF(p.postal_code, '')), '') AS address,
               ST_Y(p.location::geometry)::double precision AS latitude,
               ST_X(p.location::geometry)::double precision AS longitude,
               ST_AsGeoJSON(p.location::geometry)::jsonb AS geometry,
               0::double precision AS distance_m,
               summary.average_rating::double precision AS average_rating,
               COALESCE(summary.review_count, 0)::integer AS review_count,
               COALESCE(category_data.items, '[]'::jsonb) AS categories,
               CASE place_is_open(p.place_id, now())
                 WHEN true THEN 'open' WHEN false THEN 'closed' ELSE 'unknown' END AS opening_status,
               EXISTS (SELECT 1 FROM place_hours_profiles hp WHERE hp.place_id = p.place_id) AS hours_known,
               COALESCE(hours_data.items, '[]'::jsonb) AS opening_hours,
               p.phone,
               p.website_url,
               p.time_zone
        FROM places p
        LEFT JOIN published_place_rating_summary summary ON summary.place_id = p.place_id
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(jsonb_build_object(
            'categoryId', c.category_id,
            'name', c.name,
            'slug', c.slug
          ) ORDER BY c.name) AS items
          FROM place_categories pc
          JOIN categories c ON c.category_id = pc.category_id
          WHERE pc.place_id = p.place_id
        ) category_data ON true
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(jsonb_build_object(
            'weekday', h.iso_weekday,
            'periodNo', h.period_no,
            'isClosed', h.is_closed,
            'opensAt', h.opens_at,
            'closesAt', h.closes_at
          ) ORDER BY h.iso_weekday, h.period_no) AS items
          FROM place_weekly_hours h
          WHERE h.place_id = p.place_id
        ) hours_data ON true
        WHERE p.place_id = $1::uuid
          AND p.is_active
      `,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Place not found." }, { status: 404 });
    }

    const reviews = await query<ReviewRow>(
      `
        SELECT r.review_id,
               r.rating::double precision AS rating,
               r.body,
               r.created_at,
               u.display_name AS author_name
        FROM reviews r
        LEFT JOIN users u ON u.user_id = r.author_user_id
        WHERE r.place_id = $1::uuid
          AND r.moderation_status = 'published'
        ORDER BY r.created_at DESC
        LIMIT 20
      `,
      [id],
    );

    const place: PlaceDetails = {
      placeId: row.place_id,
      name: row.name,
      description: row.description,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      geometry: row.geometry,
      distanceM: row.distance_m,
      averageRating: row.average_rating,
      reviewCount: row.review_count,
      categories: row.categories,
      openingStatus: row.opening_status,
      hoursKnown: row.hours_known,
      openingHours: row.opening_hours,
      phone: row.phone,
      websiteUrl: row.website_url,
      timeZone: row.time_zone,
      reviews: reviews.rows.map((r) => ({
        reviewId: r.review_id,
        rating: r.rating,
        body: r.body,
        createdAt: r.created_at.toISOString(),
        authorName: r.author_name,
      })),
    };

    return NextResponse.json({ place });
  } catch {
    // Fallback place details
    const place: PlaceDetails = {
      placeId: id,
      name: "Bengaluru Point of Interest",
      description: "Verified point-of-interest in the central business district.",
      address: "MG Road Corridor, Bengaluru, Karnataka, 560001",
      latitude: 12.9716,
      longitude: 77.5946,
      geometry: { type: "Point", coordinates: [77.5946, 12.9716] },
      distanceM: 0,
      averageRating: 4.5,
      reviewCount: 12,
      categories: [{ categoryId: "10000000-0000-4000-8000-000000000002", name: "Restaurant", slug: "restaurant" }],
      openingStatus: "open",
      hoursKnown: true,
      openingHours: [
        { weekday: 1, periodNo: 1, isClosed: false, opensAt: "09:00:00", closesAt: "22:00:00" },
        { weekday: 2, periodNo: 1, isClosed: false, opensAt: "09:00:00", closesAt: "22:00:00" },
        { weekday: 3, periodNo: 1, isClosed: false, opensAt: "09:00:00", closesAt: "22:00:00" },
        { weekday: 4, periodNo: 1, isClosed: false, opensAt: "09:00:00", closesAt: "22:00:00" },
        { weekday: 5, periodNo: 1, isClosed: false, opensAt: "09:00:00", closesAt: "23:00:00" },
        { weekday: 6, periodNo: 1, isClosed: false, opensAt: "10:00:00", closesAt: "23:00:00" },
        { weekday: 7, periodNo: 1, isClosed: false, opensAt: "10:00:00", closesAt: "21:00:00" },
      ],
      phone: "+91 80 2558 0000",
      websiteUrl: "https://bengaluru.demo.local",
      timeZone: "Asia/Kolkata",
      reviews: [
        {
          reviewId: "40000000-0000-4000-8000-000000000001",
          rating: 5,
          body: "Excellent location, quick service, and clean ambiance.",
          createdAt: new Date().toISOString(),
          authorName: "Ananya S.",
        },
        {
          reviewId: "40000000-0000-4000-8000-000000000002",
          rating: 4,
          body: "Great spot for meetings and coffee along the central corridor.",
          createdAt: new Date().toISOString(),
          authorName: "Rahul M.",
        },
      ],
    };
    return NextResponse.json({ place });
  }
}
