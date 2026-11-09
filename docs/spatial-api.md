# Spatial search API

These read-only Next.js route handlers use the server-side `pg` connection pool. The database URL is read only from `web/.env.local`; it is never sent to browser code. All user-supplied values are validated and SQL values are passed as parameters.

## `GET /api/places/nearby`

Returns up to 100 active places from PostgreSQL within the requested radius. Coordinates are WGS84 degrees (latitude and longitude parameters); radius is meters. The database `nearby_places()` function applies `ST_DWithin`, category filtering, minimum average rating, and distance calculation using `ST_Distance`. `place_is_open()` evaluates each place's local time zone. Results are sorted by distance or rating.

### Query parameters

| Name | Required | Accepted values | Meaning |
|---|---:|---|---|
| `latitude` | yes | Number, `-90` to `90` | Search center latitude. |
| `longitude` | yes | Number, `-180` to `180` | Search center longitude. |
| `radius` | yes | Number, greater than 0 through `100000` | Radius in meters. UI presets use 1000, 5000, and 10000; custom radius is capped at 100 km. |
| `category` | no | Category slug from `/api/categories` | Filter to a category (for example `restaurant` or `hospital`). Omit or use no category filter for all. |
| `minimumRating` | no | Number from 1 through 5 | Minimum published-review average. Places with no published average do not match this filter. |
| `openingStatus` | no | `all`, `open`, `closed`, `unknown` | Current status in each place's IANA time zone. Defaults to `all`. Missing hours remain `unknown`. |
| `sort` | no | `distance`, `rating` | Nearest first or highest average rating first; ties use distance. Defaults to `distance`. |

Example:

```text
/api/places/nearby?latitude=12.9716&longitude=77.5946&radius=5000&category=restaurant&minimumRating=4&openingStatus=open&sort=distance
```

Successful response:

```json
{
  "count": 1,
  "places": [
    {
      "placeId": "20000000-0000-4000-8000-000000000001",
      "name": "Demo Central Bistro",
      "description": "Synthetic demonstration restaurant near the map search origin.",
      "address": "10 Example Road, Bengaluru, Karnataka, 560001",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "geometry": { "type": "Point", "coordinates": [77.5946, 12.9716] },
      "distanceM": 0,
      "averageRating": 4.25,
      "reviewCount": 4,
      "categories": [{ "categoryId": "…", "name": "Restaurant", "slug": "restaurant" }],
      "openingStatus": "open",
      "hoursKnown": true,
      "openingHours": [{ "weekday": 1, "periodNo": 1, "isClosed": false, "opensAt": "09:00:00", "closesAt": "22:00:00" }]
    }
  ]
}
```

The response example uses the synthetic seed values. The API itself does not provide mock results. `geometry.coordinates` is standard GeoJSON order `[longitude, latitude]`; top-level coordinate fields are included for convenient map placement.

## `GET /api/categories`

Returns distinct categories attached to active places, ordered by name. The UI uses these rows to populate its category filter instead of hardcoding category options.

```json
{
  "categories": [
    { "categoryId": "…", "name": "Cafe", "slug": "cafe" },
    { "categoryId": "…", "name": "Hospital", "slug": "hospital" }
  ]
}
```

## `GET /api/places/{id}`

`id` must be a UUID. Returns an active place, category assignments, rating summary, GeoJSON point, current opening status, weekly schedule, contact fields, and up to 20 most recent published reviews. Rating-only reviews return `body: null`. Hidden/pending reviews are excluded.

```json
{
  "place": {
    "placeId": "20000000-0000-4000-8000-000000000001",
    "name": "Demo Central Bistro",
    "distanceM": 0,
    "averageRating": 4.25,
    "reviewCount": 4,
    "openingStatus": "open",
    "hoursKnown": true,
    "timeZone": "Asia/Kolkata",
    "reviews": [
      { "reviewId": "…", "rating": 4.5, "body": "Synthetic review text", "createdAt": "2026-10-01T09:00:00.000Z", "authorName": "Demo Alex" }
    ]
  }
}
```

`distanceM` on a standalone detail request is `0` because there is no search origin in that endpoint.

## Errors

- `400 Bad Request`: missing/invalid center, coordinate out of range, radius outside the allowed range, invalid rating, unsupported sort/status, malformed category slug, or invalid UUID.
- `404 Not Found`: valid UUID for no active place.
- `503 Service Unavailable`: PostgreSQL connection/query failure. Error responses do not include SQL, connection strings, or credentials.

The endpoints are read-only and currently unauthenticated. Production deployment should put them behind the project's authorization/rate-limit policy before exposing user-specific or private data.
