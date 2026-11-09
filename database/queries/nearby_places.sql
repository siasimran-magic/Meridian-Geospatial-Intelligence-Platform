-- Nearby places in a 5 km radius, sorted by distance, with optional filters.
-- Longitude comes before latitude; radius is in meters. Adjust the literals.
SELECT *
FROM nearby_places(
    p_longitude := 77.5946,
    p_latitude := 12.9716,
    p_radius_m := 5000,
    p_category_slug := 'restaurant',
    p_min_rating := 4.0
);

-- Open-state check: true=open, false=closed, NULL=unknown/inactive/missing place.
SELECT p.name, place_is_open(p.place_id, now()) AS is_open
FROM places p
WHERE p.is_active
ORDER BY p.name;
