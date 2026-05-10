-- Phase 4 follow-up: support multiple photos per sighting.
--
-- Replaces sightings.photo_url (single text) with sightings.photos (text[]).
-- Existing rows with a photo_url are migrated into a single-element array.
--
-- Storage layout for new uploads: sighting-photos/{user_id}/{sighting_id}/{idx}.{ext}
-- (was: {user_id}/{sighting_id}.{ext}). The user_id stays the first path
-- segment, so the existing storage RLS policies in 0004 still apply.

alter table public.sightings
  add column if not exists photos text[] not null default '{}';

update public.sightings
set photos = array[photo_url]
where photo_url is not null
  and photo_url <> ''
  and (photos is null or array_length(photos, 1) is null);

alter table public.sightings
  drop column if exists photo_url;
