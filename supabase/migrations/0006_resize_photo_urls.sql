-- Phase 5 follow-up: realign Wikimedia thumbnail URLs.
--
-- Wikimedia's CDN now serves thumbnails only at a fixed set of "common
-- sizes" (120, 250, 330, 500, 960, 1280, 1920). Our ingest script wrote
-- `/640px-…` URLs, which the CDN now returns 400 for. Rewrite to 500px,
-- which is in the allowed list and still mobile-friendly.
--
-- Idempotent: rows already at /500px- are unaffected.

update public.birds
set photo_url = replace(photo_url, '/640px-', '/500px-')
where photo_url like '%/640px-%';
