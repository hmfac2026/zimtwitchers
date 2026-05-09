-- 0002: drop pgcrypto from invite-code generation
--
-- The original create_group_with_member used extensions.gen_random_bytes,
-- which lives in Supabase's `extensions` schema. SECURITY DEFINER functions
-- with `set search_path = public` can't see it, and qualifying the call
-- still failed in this project (likely a permissions issue on the
-- extensions schema for the `authenticated` role).
--
-- Switch to gen_random_uuid(), which is in core Postgres 13+ and is already
-- proven to work in this DB (it's the default for `groups.id`). Take the
-- first 8 hex chars of the UUID as the invite code.

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

  v_invite_code := upper(substr(gen_random_uuid()::text, 1, 8));

  insert into public.groups (name, invite_code, created_by)
  values (trim(p_group_name), v_invite_code, v_uid)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, display_name)
  values (v_group_id, v_uid, trim(p_display_name));

  return query select v_group_id, v_invite_code;
end;
$$;
