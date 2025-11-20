-- Allow global owner (superadmin) to create invites for any event
set search_path = public;

do $$
declare rec record;
begin
  -- Drop any existing overloads of create_event_invite to avoid conflict
  for rec in
    select p.oid as oid, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_event_invite'
  loop
    execute format('drop function if exists public.create_event_invite(%s);', rec.args);
  end loop;
end $$;

create or replace function public.create_event_invite(
  p_event_id uuid,
  p_email text,
  p_role text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := lower(coalesce(p_role,'viewer'));
  v_token text := md5(random()::text || clock_timestamp()::text || coalesce(v_uid::text,'') || coalesce(p_email,'') || coalesce(p_role,''));
  v_ok boolean := false;
  v_is_global_owner boolean := public.is_global_owner();
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  -- Normalize role; support wasit/admin in invites
  if v_role not in ('viewer','editor','admin','wasit') then
    v_role := 'viewer';
  end if;

  -- Allow if: event owner, event editor, or global owner
  select exists (
           select 1 from public.events e where e.id = p_event_id and e.owner_id = v_uid
         )
      or exists (
           select 1 from public.event_members em where em.event_id = p_event_id and em.user_id = v_uid and em.role in ('owner','editor')
         )
      or v_is_global_owner
    into v_ok;
  if not v_ok then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.event_invites(event_id, email, role, token)
  values (p_event_id, trim(p_email), v_role, v_token);
  return v_token;
end;
$$;

grant execute on function public.create_event_invite(uuid, text, text) to authenticated;

do $$ begin
  begin
    alter function public.create_event_invite(uuid, text, text) owner to postgres;
  exception when others then
    null;
  end;
end $$;
