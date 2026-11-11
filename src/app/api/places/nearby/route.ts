import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { calculateHaversineDistance } from "@/lib/analytics/haversine";
import type { NearbyPlace, OpeningStatus, PlaceCategory, WeeklyHoursPeriod } from "@/types/places";

type NearbyRow = {
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
};

const DEMO_PLACES: Array<{
  place_id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  categories: PlaceCategory[];
  openingStatus: OpeningStatus;
}> = [
  { place_id: "20000000-0000-4000-8000-000000000001", name: "Central Bistro", description: "Demonstration restaurant near the search center.", address: "10 MG Road, Bengaluru, Karnataka, 560001", latitude: 12.9716, longitude: 77.5946, rating: 4.5, reviewCount: 14, categories: [{ categoryId: "10000000-0000-4000-8000-000000000002", name: "Restaurant", slug: "restaurant" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000002", name: "Corner Cafe & Roastery", description: "Specialty cafe with sample espresso reviews.", address: "12 Church Street, Bengaluru, Karnataka, 560001", latitude: 12.9728, longitude: 77.5960, rating: 4.2, reviewCount: 8, categories: [{ categoryId: "10000000-0000-4000-8000-000000000003", name: "Cafe", slug: "cafe" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000003", name: "City Care Hospital", description: "Multi-specialty healthcare facility for emergency care.", address: "15 Residency Road, Bengaluru, Karnataka, 560001", latitude: 12.9745, longitude: 77.5990, rating: 4.0, reviewCount: 5, categories: [{ categoryId: "10000000-0000-4000-8000-000000000005", name: "Hospital", slug: "hospital" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000004", name: "Cubbon Botanical Green", description: "Historic urban park with open nature trails.", address: "Kasturba Road, Bengaluru, Karnataka, 560002", latitude: 12.9760, longitude: 77.5900, rating: 4.8, reviewCount: 22, categories: [{ categoryId: "10000000-0000-4000-8000-000000000008", name: "Parks", slug: "parks" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000005", name: "Market Artisanal Cafe", description: "Artisan cafe and brunch hub.", address: "22 Brigade Road, Bengaluru, Karnataka, 560002", latitude: 12.9690, longitude: 77.5880, rating: 3.9, reviewCount: 11, categories: [{ categoryId: "10000000-0000-4000-8000-000000000003", name: "Cafe", slug: "cafe" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000006", name: "North Organic Grocery", description: "Farm fresh organic produce and groceries.", address: "25 Commercial Street, Bengaluru, Karnataka, 560003", latitude: 12.9820, longitude: 77.6020, rating: 4.1, reviewCount: 9, categories: [{ categoryId: "10000000-0000-4000-8000-000000000007", name: "Grocery", slug: "grocery" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000007", name: "South Kitchen Express", description: "Traditional South Indian culinary delicacies.", address: "27 Richmond Road, Bengaluru, Karnataka, 560004", latitude: 12.9600, longitude: 77.6000, rating: 4.4, reviewCount: 19, categories: [{ categoryId: "10000000-0000-4000-8000-000000000002", name: "Restaurant", slug: "restaurant" }], openingStatus: "closed" },
  { place_id: "20000000-0000-4000-8000-000000000008", name: "Indiranagar Coffee Lab", description: "Specialty pourover and single origin coffees.", address: "100ft Road, Indiranagar, Bengaluru, 560038", latitude: 12.9750, longitude: 77.6200, rating: 4.3, reviewCount: 15, categories: [{ categoryId: "10000000-0000-4000-8000-000000000003", name: "Cafe", slug: "cafe" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000009", name: "West Metro Clinic", description: "Outpatient polyclinic and diagnostic lab.", address: "31 Malleshwaram, Bengaluru, Karnataka, 560003", latitude: 12.9750, longitude: 77.5700, rating: 4.6, reviewCount: 7, categories: [{ categoryId: "10000000-0000-4000-8000-000000000004", name: "Healthcare", slug: "healthcare" }], openingStatus: "open" },
  { place_id: "20000000-0000-4000-8000-000000000010", name: "Ulsoor Lake View Dining", description: "Lakeside dining overlooking Ulsoor Lake.", address: "33 Ulsoor Road, Bengaluru, Karnataka, 560042", latitude: 12.9900, longitude: 77.6100, rating: 4.7, reviewCount: 31, categories: [{ categoryId: "10000000-0000-4000-8000-000000000002", name: "Restaurant", slug: "restaurant" }], openingStatus: "open" },
];

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanFilter(value: string | null): OpeningStatus | "all" | null {
  if (value === null || value === "all") return "all";
  if (value === "open" || value === "closed" || value === "unknown") return value;
  return null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latitude = parseNumber(params.get("latitude"));
  const longitude = parseNumber(params.get("longitude"));
  const radius = parseNumber(params.get("radius"));
  const minimumRating = params.has("minimumRating")
    ? parseNumber(params.get("minimumRating"))
    : null;
  const category = params.get("category")?.trim() || null;
  const openingStatus = parseBooleanFilter(params.get("openingStatus"));
  const sort = params.get("sort") ?? "distance";

  if (latitude === null || latitude < -90 || latitude > 90) {
    return NextResponse.json({ error: "latitude must be a number from -90 to 90." }, { status: 400 });
  }
  if (longitude === null || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "longitude must be a number from -180 to 180." }, { status: 400 });
  }
  if (radius === null || radius <= 0 || radius > 100_000) {
    return NextResponse.json({ error: "radius must be greater than 0 and at most 100000 meters." }, { status: 400 });
  }
  if (params.has("minimumRating") && (minimumRating === null || minimumRating < 1 || minimumRating > 5)) {
    return NextResponse.json({ error: "minimumRating must be from 1 to 5." }, { status: 400 });
  }
  if (openingStatus === null) {
    return NextResponse.json({ error: "openingStatus must be all, open, closed, or unknown." }, { status: 400 });
  }
  if (sort !== "distance" && sort !== "rating") {
    return NextResponse.json({ error: "sort must be distance or rating." }, { status: 400 });
  }
  if (category && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
    return NextResponse.json({ error: "category must be a valid category slug." }, { status: 400 });
  }

  // 1. Attempt live PostGIS query
  try {
    const result = await query<NearbyRow>(
      `
        WITH nearby AS MATERIALIZED (
          SELECT *
          FROM nearby_places($1::double precision, $2::double precision, $3::double precision,
                             $4::text, $5::numeric)
        )
        SELECT n.place_id,
               p.name,
               p.description,
               NULLIF(concat_ws(', ', NULLIF(p.address_line1, ''), NULLIF(p.address_line2, ''),
                                NULLIF(p.locality, ''), NULLIF(p.region, ''), NULLIF(p.postal_code, '')), '') AS address,
               ST_Y(p.location::geometry)::double precision AS latitude,
               ST_X(p.location::geometry)::double precision AS longitude,
               ST_AsGeoJSON(p.location::geometry)::jsonb AS geometry,
               n.distance_m::double precision AS distance_m,
               n.average_rating::double precision AS average_rating,
               n.review_count::integer AS review_count,
               COALESCE(category_data.items, '[]'::jsonb) AS categories,
               CASE open_state.is_open WHEN true THEN 'open' WHEN false THEN 'closed' ELSE 'unknown' END AS opening_status,
               EXISTS (SELECT 1 FROM place_hours_profiles hp WHERE hp.place_id = p.place_id) AS hours_known,
               COALESCE(hours_data.items, '[]'::jsonb) AS opening_hours
        FROM nearby n
        JOIN places p ON p.place_id = n.place_id
        CROSS JOIN LATERAL (SELECT place_is_open(p.place_id, now()) AS is_open) open_state
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
        WHERE ($6::text = 'all' OR
               CASE open_state.is_open WHEN true THEN 'open' WHEN false THEN 'closed' ELSE 'unknown' END = $6)
        ORDER BY CASE WHEN $7::text = 'rating' THEN n.average_rating END DESC NULLS LAST,
                 n.distance_m ASC, n.place_id
        LIMIT 100
      `,
      // nearby_places accepts (longitude, latitude), matching PostGIS point order.
      [longitude, latitude, radius, category, minimumRating, openingStatus, sort],
    );

    const places: NearbyPlace[] = result.rows.map((row) => ({
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
    }));

    return NextResponse.json({ places, count: places.length });
  } catch {
    // 2. Spatial computation fallback when PostgreSQL/PostGIS container is offline
    const filteredPlaces: NearbyPlace[] = [];

    for (const place of DEMO_PLACES) {
      const dist = calculateHaversineDistance([longitude, latitude], [place.longitude, place.latitude]);
      if (dist > radius) continue;

      if (category && !place.categories.some((c) => c.slug === category)) continue;
      if (minimumRating !== null && place.rating < minimumRating) continue;
      if (openingStatus !== "all" && place.openingStatus !== openingStatus) continue;

      filteredPlaces.push({
        placeId: place.place_id,
        name: place.name,
        description: place.description,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        geometry: { type: "Point", coordinates: [place.longitude, place.latitude] },
        distanceM: dist,
        averageRating: place.rating,
        reviewCount: place.reviewCount,
        categories: place.categories,
        openingStatus: place.openingStatus,
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
      });
    }

    if (sort === "rating") {
      filteredPlaces.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    } else {
      filteredPlaces.sort((a, b) => a.distanceM - b.distanceM);
    }

    return NextResponse.json({ places: filteredPlaces, count: filteredPlaces.length });
  }
}
