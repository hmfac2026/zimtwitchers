-- Phase 2: Auth + groups
-- Creates `groups` and `group_members` tables, RLS policies, and SECURITY DEFINER
-- helper functions for the create-group and join-by-invite-code flows.

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 60),
  invite_code text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id     uuid not null references public.groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  avatar_url   text,
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id),
  -- v1 constraint: a user belongs to exactly one group
  unique (user_id)
);

create index if not exists group_members_group_idx on public.group_members(group_id);

-- ----------------------------------------------------------------------------
-- Helper used by RLS policies. SECURITY DEFINER + STABLE so it can run
-- inside a USING clause without recursing.
-- ----------------------------------------------------------------------------

create or replace function public.is_group_member(g_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = g_id
      and user_id  = auth.uid()
  );
$$;

revoke execute on function public.is_group_member(uuid) from public;
grant  execute on function public.is_group_member(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- groups: a member can read their own group; no direct insert/update/delete
-- from the client (handled by the RPC functions below).
drop policy if exists groups_select_own_group on public.groups;
create policy groups_select_own_group
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

-- group_members: a member can read all rows for their group, and update
-- their own profile fields. Inserts go through the RPC functions.
drop policy if exists group_members_select_own_group on public.group_members;
create policy group_members_select_own_group
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_members_update_self on public.group_members;
create policy group_members_update_self
  on public.group_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RPC: create a new group and add the current user as the first member.
-- Returns (group_id, invite_code).
-- ----------------------------------------------------------------------------

create or replace function public.create_group_with_member(
  p_group_name   text,
  p_display_name text
)
returns table (group_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_group_id    uuid;
  v_invite_code text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'already_in_group';
  end if;

  -- 8-char hex invite code (case-insensitive on lookup)
  v_invite_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));

  insert into public.groups (name, invite_code, created_by)
  values (trim(p_group_name), v_invite_code, v_uid)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, display_name)
  values (v_group_id, v_uid, trim(p_display_name));

  return query select v_group_id, v_invite_code;
end;
$$;

revoke execute on function public.create_group_with_member(text, text) from public;
grant  execute on function public.create_group_with_member(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: join an existing group by invite code.
-- ----------------------------------------------------------------------------

create or replace function public.join_group_by_code(
  p_invite_code  text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'already_in_group';
  end if;

  select id
    into v_group_id
    from public.groups
   where invite_code = upper(trim(p_invite_code));

  if v_group_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.group_members (group_id, user_id, display_name)
  values (v_group_id, v_uid, trim(p_display_name));

  return v_group_id;
end;
$$;

revoke execute on function public.join_group_by_code(text, text) from public;
grant  execute on function public.join_group_by_code(text, text) to authenticated;
