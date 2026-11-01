-- Clearly synthetic, deterministic demonstration dataset. Safe to rerun: every
-- insert uses stable UUIDs and ON CONFLICT DO NOTHING. Never use as real data.
BEGIN;

INSERT INTO users (user_id, email, display_name, password_hash, role) VALUES
('00000000-0000-4000-8000-000000000001', 'demo.admin@example.test', 'Demo Administrator', NULL, 'admin'),
('00000000-0000-4000-8000-000000000002', 'demo.alex@example.test', 'Demo Alex', NULL, 'user'),
('00000000-0000-4000-8000-000000000003', 'demo.blair@example.test', 'Demo Blair', NULL, 'user'),
('00000000-0000-4000-8000-000000000004', 'demo.casey@example.test', 'Demo Casey', NULL, 'user'),
('00000000-0000-4000-8000-000000000005', 'demo.dev@example.test', 'Demo Dev', NULL, 'user')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO categories (category_id, name, slug, description, parent_category_id) VALUES
('10000000-0000-4000-8000-000000000001', 'Food and Drink', 'food-drink', 'Synthetic top-level food and drink category.', NULL),
('10000000-0000-4000-8000-000000000002', 'Restaurant', 'restaurant', 'Synthetic restaurant category.', '10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000003', 'Cafe', 'cafe', 'Synthetic cafe category.', '10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000004', 'Healthcare', 'healthcare', 'Synthetic healthcare category.', NULL),
('10000000-0000-4000-8000-000000000005', 'Hospital', 'hospital', 'Synthetic hospital category.', '10000000-0000-4000-8000-000000000004'),
('10000000-0000-4000-8000-000000000006', 'Shopping', 'shopping', 'Synthetic shopping category.', NULL),
('10000000-0000-4000-8000-000000000007', 'Grocery', 'grocery', 'Synthetic grocery category.', '10000000-0000-4000-8000-000000000006'),
('10000000-0000-4000-8000-000000000008', 'Parks', 'parks', 'Synthetic park category.', NULL)
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO places
    (place_id, name, description, address_line1, locality, region, postal_code,
     country_code, location, time_zone, is_active, created_by_user_id)
VALUES
('20000000-0000-4000-8000-000000000001', 'Demo Central Bistro', 'Synthetic demonstration restaurant near the map search origin.', '10 Example Road', 'Bengaluru', 'Karnataka', '560001', 'IN', checked_geography_point(77.5946, 12.9716), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002', 'Demo Corner Cafe', 'Synthetic cafe with sample coffee reviews.', '12 Demo Lane', 'Bengaluru', 'Karnataka', '560001', 'IN', checked_geography_point(77.5960, 12.9728), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000003', 'Demo City Hospital', 'Synthetic healthcare point for spatial filters.', '15 Sample Avenue', 'Bengaluru', 'Karnataka', '560001', 'IN', checked_geography_point(77.5990, 12.9745), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000004', 'Demo Green Park', 'Synthetic park with an explicitly closed weekly schedule.', '20 Test Street', 'Bengaluru', 'Karnataka', '560002', 'IN', checked_geography_point(77.5900, 12.9760), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000005', 'Demo Market Cafe', 'Synthetic cafe and restaurant category example.', '22 Mock Road', 'Bengaluru', 'Karnataka', '560002', 'IN', checked_geography_point(77.5880, 12.9690), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000006', 'Demo North Grocery', 'Synthetic grocery store.', '25 Fixture Street', 'Bengaluru', 'Karnataka', '560003', 'IN', checked_geography_point(77.6020, 12.9820), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000007', 'Demo South Kitchen', 'Synthetic restaurant.', '27 Fixture Street', 'Bengaluru', 'Karnataka', '560004', 'IN', checked_geography_point(77.6000, 12.9600), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000008', 'Demo East Cafe', 'Synthetic cafe.', '29 Fixture Street', 'Bengaluru', 'Karnataka', '560005', 'IN', checked_geography_point(77.6200, 12.9750), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000009', 'Demo West Clinic', 'Synthetic hospital/healthcare example.', '31 Fixture Street', 'Bengaluru', 'Karnataka', '560006', 'IN', checked_geography_point(77.5700, 12.9750), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000010', 'Demo Lake Restaurant', 'Synthetic restaurant.', '33 Fixture Street', 'Bengaluru', 'Karnataka', '560007', 'IN', checked_geography_point(77.6100, 12.9900), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000011', 'Demo Museum Cafe', 'Synthetic cafe.', '35 Fixture Street', 'Bengaluru', 'Karnataka', '560008', 'IN', checked_geography_point(77.5800, 12.9900), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000012', 'Demo South Hospital', 'Synthetic hospital.', '37 Fixture Street', 'Bengaluru', 'Karnataka', '560009', 'IN', checked_geography_point(77.6050, 12.9450), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000013', 'Demo Central Grocer', 'Synthetic grocery.', '39 Fixture Street', 'Bengaluru', 'Karnataka', '560010', 'IN', checked_geography_point(77.6250, 12.9550), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000014', 'Demo Garden Park', 'Synthetic park.', '41 Fixture Street', 'Bengaluru', 'Karnataka', '560011', 'IN', checked_geography_point(77.5650, 12.9600), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000015', 'Demo Tech Restaurant', 'Synthetic restaurant.', '43 Fixture Street', 'Bengaluru', 'Karnataka', '560012', 'IN', checked_geography_point(77.6500, 12.9800), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000016', 'Demo Valley Cafe', 'Synthetic cafe.', '45 Fixture Street', 'Bengaluru', 'Karnataka', '560013', 'IN', checked_geography_point(77.5400, 12.9800), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000017', 'Demo Outer Clinic', 'Synthetic hospital.', '47 Fixture Street', 'Bengaluru', 'Karnataka', '560014', 'IN', checked_geography_point(77.6300, 12.9300), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000018', 'Demo Outer Grocery', 'Synthetic grocery.', '49 Fixture Street', 'Bengaluru', 'Karnataka', '560015', 'IN', checked_geography_point(77.5200, 12.9500), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000019', 'Demo Outer Park', 'Synthetic park.', '51 Fixture Street', 'Bengaluru', 'Karnataka', '560016', 'IN', checked_geography_point(77.6800, 12.9200), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000020', 'Demo Distant Bistro', 'Synthetic farther restaurant for radius boundary tests.', '53 Fixture Street', 'Bengaluru', 'Karnataka', '560017', 'IN', checked_geography_point(77.7000, 13.0200), 'Asia/Kolkata', true, '00000000-0000-4000-8000-000000000001')
ON CONFLICT (place_id) DO NOTHING;

INSERT INTO place_categories (place_id, category_id) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000008'),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000007'),
('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000007'),
('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000008'),
('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000003'),
('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000005'),
('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000007'),
('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000008'),
('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000002')
ON CONFLICT (place_id, category_id) DO NOTHING;

INSERT INTO place_hours_profiles (place_id, verified_at) VALUES
('20000000-0000-4000-8000-000000000001', now()),
('20000000-0000-4000-8000-000000000002', now()),
('20000000-0000-4000-8000-000000000004', now())
ON CONFLICT (place_id) DO NOTHING;

INSERT INTO place_weekly_hours (place_id, iso_weekday, period_no, is_closed, opens_at, closes_at)
SELECT schedule.place_id,
       day_no::smallint,
       1,
       coalesce(schedule.closed_all OR day_no = schedule.closed_day, false),
       CASE WHEN schedule.closed_all OR day_no = schedule.closed_day THEN NULL ELSE schedule.opens_at END,
       CASE WHEN schedule.closed_all OR day_no = schedule.closed_day THEN NULL ELSE schedule.closes_at END
FROM (VALUES
    ('20000000-0000-4000-8000-000000000001'::uuid, NULL::integer, false, '09:00'::time, '22:00'::time),
    ('20000000-0000-4000-8000-000000000002'::uuid, 7, false, '08:00'::time, '18:00'::time),
    ('20000000-0000-4000-8000-000000000004'::uuid, NULL::integer, true, NULL::time, NULL::time)
) AS schedule(place_id, closed_day, closed_all, opens_at, closes_at)
CROSS JOIN generate_series(1, 7) AS days(day_no)
ON CONFLICT (place_id, iso_weekday, period_no) DO NOTHING;

INSERT INTO reviews (review_id, place_id, author_user_id, rating, body, moderation_status, created_at) VALUES
('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 4.5, 'Synthetic review: friendly service and excellent masala dosa.', 'published', '2026-10-01T09:00:00Z'),
('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: tasty lunch and quick service.', 'published', '2026-10-02T09:00:00Z'),
('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 5.0, NULL, 'published', '2026-10-03T09:00:00Z'),
('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 4.5, 'Synthetic review: rich coffee and quiet seating.', 'published', '2026-10-04T09:00:00Z'),
('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', 3.5, 'Synthetic review: coffee was good but the queue was long.', 'published', '2026-10-05T09:00:00Z'),
('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: helpful hospital staff and clean rooms.', 'published', '2026-10-06T09:00:00Z'),
('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 4.5, NULL, 'published', '2026-10-07T09:00:00Z'),
('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 4.0, 'Synthetic review: peaceful green park and shaded paths.', 'published', '2026-10-08T09:00:00Z'),
('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', 4.0, 'Synthetic review: fresh pastries and friendly cafe staff.', 'published', '2026-10-09T09:00:00Z'),
('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', 4.5, NULL, 'published', '2026-10-10T09:00:00Z'),
('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000004', 3.5, 'Synthetic review: useful grocery selection and fair prices.', 'published', '2026-10-11T09:00:00Z'),
('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000005', 4.5, 'Synthetic review: excellent dinner and warm service.', 'published', '2026-10-12T09:00:00Z'),
('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000002', 3.0, 'Synthetic review: average coffee and limited seating.', 'published', '2026-10-13T09:00:00Z'),
('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: attentive clinic team.', 'published', '2026-10-14T09:00:00Z'),
('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000004', 5.0, 'Synthetic review: delicious dinner and quick service.', 'published', '2026-10-15T09:00:00Z'),
('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000005', 4.0, 'Synthetic review: smooth coffee and calm atmosphere.', 'published', '2026-10-16T09:00:00Z'),
('30000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 3.5, NULL, 'published', '2026-10-17T09:00:00Z'),
('30000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000003', 4.5, 'Synthetic review: fresh produce and helpful checkout.', 'published', '2026-10-18T09:00:00Z'),
('30000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000004', 4.0, 'Synthetic review: green garden with clean paths.', 'published', '2026-10-19T09:00:00Z'),
('30000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000005', 4.5, 'Synthetic review: flavorful meal and excellent service.', 'published', '2026-10-20T09:00:00Z'),
('30000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000002', 3.5, 'Synthetic review: good espresso and comfortable chairs.', 'published', '2026-10-21T09:00:00Z'),
('30000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000003', 4.0, 'Synthetic review: professional healthcare staff.', 'published', '2026-10-22T09:00:00Z'),
('30000000-0000-4000-8000-000000000023', '20000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000004', 4.0, 'Synthetic review: well stocked grocery shelves.', 'published', '2026-10-23T09:00:00Z'),
('30000000-0000-4000-8000-000000000024', '20000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000005', 5.0, 'Synthetic review: lovely park and quiet walking paths.', 'published', '2026-10-24T09:00:00Z'),
('30000000-0000-4000-8000-000000000025', '20000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000002', 4.0, 'Synthetic review: tasty food though farther from the center.', 'published', '2026-10-25T09:00:00Z'),
('30000000-0000-4000-8000-000000000026', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 3.5, 'Synthetic review: good vegetarian options.', 'published', '2026-10-26T09:00:00Z'),
('30000000-0000-4000-8000-000000000027', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004', 5.0, 'Synthetic review: excellent filter coffee.', 'published', '2026-10-27T09:00:00Z'),
('30000000-0000-4000-8000-000000000028', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005', 3.5, 'Synthetic review: clean hospital and helpful reception.', 'published', '2026-10-28T09:00:00Z'),
('30000000-0000-4000-8000-000000000029', '20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 4.5, NULL, 'published', '2026-10-29T09:00:00Z'),
('30000000-0000-4000-8000-000000000030', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 4.0, 'Synthetic review: nice bakery pastries and coffee.', 'published', '2026-10-30T09:00:00Z'),
('30000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 4.5, 'Synthetic review: good selection and friendly staff.', 'published', '2026-10-31T09:00:00Z'),
('30000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000004', 4.0, 'Synthetic review: tasty breakfast and fast service.', 'published', '2026-11-01T09:00:00Z')
ON CONFLICT (review_id) DO NOTHING;

INSERT INTO check_ins (check_in_id, user_id, place_id, checked_in_at, source) VALUES
('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '2026-10-20T09:00:00Z', 'manual'),
('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '2026-10-21T09:00:00Z', 'manual'),
('40000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', '2026-10-22T09:00:00Z', 'trajectory'),
('40000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', '2026-10-23T09:00:00Z', 'manual'),
('40000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', '2026-10-24T09:00:00Z', 'other')
ON CONFLICT (check_in_id) DO NOTHING;

COMMIT;
