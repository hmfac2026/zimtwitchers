-- 0002: fully qualify pgcrypto calls inside SECURITY DEFINER functions.
--
-- Supabase installs pgcrypto into the `extensions` schema, but our group
-- helpers run with `set search_path = public`, so an unqualified
-- gen_random_bytes() call fails with "function gen_random_bytes(integer)
-- does not exist". Qualifying the call (extensions.gen_random_bytes) is
-- the recommended fix.

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

  v_invite_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));

  insert into public.groups (name, invite_code, created_by)
  values (trim(p_group_name), v_invite_code, v_uid)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, display_name)
  values (v_group_id, v_uid, trim(p_display_name));

  return query select v_group_id, v_invite_code;
end;
$$;
