-- Phase 5: reactions, leaderboard helper, realtime publication

-- ----------------------------------------------------------------------------
-- reactions: 👍 🦅 🔥 on a sighting. One row per (sighting, user, emoji).
-- ----------------------------------------------------------------------------

create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  user_id     uuid not null references auth.users(id)        on delete cascade,
  emoji       text not null check (emoji in ('👍', '🦅', '🔥')),
  created_at  timestamptz not null default now(),
  unique (sighting_id, user_id, emoji)
);

create index if not exists reactions_sighting_idx on public.reactions(sighting_id);

alter table public.reactions enable row level security;

drop policy if exists reactions_select_own_group on public.reactions;
create policy reactions_select_own_group
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.sightings s
      where s.id = sighting_id
        and public.is_group_member(s.group_id)
    )
  );

drop policy if exists reactions_insert_self on public.reactions;
create policy reactions_insert_self
  on public.reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.sightings s
      where s.id = sighting_id
        and public.is_group_member(s.group_id)
    )
  );

drop policy if exists reactions_delete_self on public.reactions;
create policy reactions_delete_self
  on public.reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- leaderboard_for_group: returns one row per group member with all 4 metrics.
-- "Weekly" = rolling last 7 days. Rarity score = sum of per-species rarity
-- (so seeing a robin twice doesn't double-score it).
-- ----------------------------------------------------------------------------

create or replace function public.leaderboard_for_group(p_group_id uuid)
returns table (
  user_id          uuid,
  display_name     text,
  weekly_sightings bigint,
  weekly_species   bigint,
  life_list_size   bigint,
  rarity_score     bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'not_a_group_member';
  end if;

  return query
  select
    gm.user_id,
    gm.display_name,
    coalesce(week.cnt,    0)::bigint as weekly_sightings,
    coalesce(week.uniq,   0)::bigint as weekly_species,
    coalesce(life.uniq,   0)::bigint as life_list_size,
    coalesce(rscore.score, 0)::bigint as rarity_score
  from public.group_members gm
  left join lateral (
    select count(*)::bigint as cnt,
           count(distinct s.bird_id)::bigint as uniq
    from public.sightings s
    where s.user_id = gm.user_id
      and s.group_id = p_group_id
      and s.observed_at >= now() - interval '7 days'
  ) week on true
  left join lateral (
    select count(distinct s.bird_id)::bigint as uniq
    from public.sightings s
    where s.user_id = gm.user_id
      and s.group_id = p_group_id
  ) life on true
  left join lateral (
    select sum(case b.rarity_tier
      when 'common'    then 1
      when 'uncommon'  then 3
      when 'rare'      then 5
      when 'very_rare' then 10
    end)::bigint as score
    from (
      select distinct s.bird_id
      from public.sightings s
      where s.user_id = gm.user_id and s.group_id = p_group_id
    ) seen
    join public.birds b on b.id = seen.bird_id
  ) rscore on true
  where gm.group_id = p_group_id;
end;
$$;

revoke execute on function public.leaderboard_for_group(uuid) from public;
grant  execute on function public.leaderboard_for_group(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime publication: enable change-stream on sightings + reactions.
-- The supabase_realtime publication ships with Supabase; ALTER is a no-op
-- if the table is already a member.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sightings'
  ) then
    alter publication supabase_realtime add table public.sightings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reactions'
  ) then
    alter publication supabase_realtime add table public.reactions;
  end if;
end $$;
