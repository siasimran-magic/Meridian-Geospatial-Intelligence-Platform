-- Keyword search over published review content. Rating-only reviews have an
-- empty search_document and remain available through rating-based queries.
SELECT r.review_id,
       p.name AS place_name,
       r.rating,
       r.body,
       ts_rank(r.search_document, websearch_to_tsquery('english', 'friendly service')) AS rank
FROM reviews r
JOIN places p ON p.place_id = r.place_id
WHERE r.moderation_status = 'published'
  AND r.search_document @@ websearch_to_tsquery('english', 'friendly service')
ORDER BY rank DESC, r.created_at DESC
LIMIT 20;
