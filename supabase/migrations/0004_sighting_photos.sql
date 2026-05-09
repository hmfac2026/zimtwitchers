-- Phase 4: sighting photos in Supabase Storage
--
-- Bucket layout: sighting-photos/{user_id}/{sighting_id}.{ext}
--
-- Public bucket — anyone with the URL can fetch (group invite codes are
-- private, sighting IDs are UUIDs, photo URLs are not enumerable).
-- Upgrade to a private bucket + signed URLs in v2 if leakage matters.

-- ----------------------------------------------------------------------------
-- Bucket
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('sighting-photos', 'sighting-photos', true)
on conflict (id) do update set public = excluded.public;

-- ----------------------------------------------------------------------------
-- Storage RLS — bucket-scoped, with foldername-based tenancy
-- ----------------------------------------------------------------------------

drop policy if exists "sighting_photos_read_authenticated" on storage.objects;
create policy "sighting_photos_read_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'sighting-photos');

drop policy if exists "sighting_photos_insert_own_folder" on storage.objects;
create policy "sighting_photos_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "sighting_photos_update_own_folder" on storage.objects;
create policy "sighting_photos_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "sighting_photos_delete_own_folder" on storage.objects;
create policy "sighting_photos_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sighting-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
