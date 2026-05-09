-- Phase 3: bird catalog + sightings

-- ----------------------------------------------------------------------------
-- Rarity tier enum
-- Used for both the bird catalog itself and downstream rarity scoring.
-- ----------------------------------------------------------------------------

do $$ begin
  create type public.rarity_tier as enum ('common', 'uncommon', 'rare', 'very_rare');
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- birds: the global catalog. World-wide species; rarity computed against
-- North-American frequency data so it reflects how rare a sighting would be
-- *for this group's birding area*.
-- ----------------------------------------------------------------------------

create table if not exists public.birds (
  id              uuid primary key default gen_random_uuid(),
  ebird_code      text not null unique,           -- eBird "speciesCode", stable
  common_name     text not null,
  scientific_name text not null,
  family          text,
  family_common   text,
  description     text,                           -- Wikipedia summary
  wiki_url        text,
  photo_url       text,                           -- Wikimedia thumbnail URL
  audio_url       text,                           -- (optional, future)
  range_regions   text[] not null default '{}',   -- ISO codes / region tags
  rarity_tier     public.rarity_tier not null default 'very_rare',
  na_frequency    real,                           -- raw NA frequency (0..1)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists birds_common_name_idx
  on public.birds using gin (to_tsvector('simple', common_name));
create index if not exists birds_scientific_name_idx
  on public.birds using gin (to_tsvector('simple', scientific_name));
create index if not exists birds_family_idx       on public.birds (family);
create index if not exists birds_rarity_idx       on public.birds (rarity_tier);

-- ----------------------------------------------------------------------------
-- sightings: a logged observation. user × bird × group.
-- ----------------------------------------------------------------------------

create table if not exists public.sightings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id)     on delete cascade,
  bird_id       uuid not null references public.birds(id)   on delete restrict,
  group_id      uuid not null references public.groups(id)  on delete cascade,
  observed_at   timestamptz not null default now(),
  location_lat  double precision,
  location_lng  double precision,
  photo_url     text,
  notes         text check (length(notes) <= 1000),
  count         integer not null default 1 check (count >= 1),
  created_at    timestamptz not null default now()
);

create index if not exists sightings_user_idx        on public.sightings (user_id);
create index if not exists sightings_group_idx       on public.sightings (group_id);
create index if not exists sightings_group_observed  on public.sightings (group_id, observed_at desc);
create index if not exists sightings_user_bird_idx   on public.sightings (user_id, bird_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.birds     enable row level security;
alter table public.sightings enable row level security;

-- birds: catalog is readable by any authenticated user (it's the same global
-- catalog for every group). No write access from clients; the ingest script
-- uses the service role.
drop policy if exists birds_select_authenticated on public.birds;
create policy birds_select_authenticated
  on public.birds for select
  to authenticated
  using (true);

-- sightings: a user can read sightings within their group, insert their own
-- sightings into their group, update their own, and delete their own.
drop policy if exists sightings_select_own_group on public.sightings;
create policy sightings_select_own_group
  on public.sightings for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists sightings_insert_self on public.sightings;
create policy sightings_insert_self
  on public.sightings for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  );

drop policy if exists sightings_update_self on public.sightings;
create policy sightings_update_self
  on public.sightings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists sightings_delete_self on public.sightings;
create policy sightings_delete_self
  on public.sightings for delete
  to authenticated
  using (user_id = auth.uid());
