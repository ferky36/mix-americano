-- Generic RPCs for cashflow CUD with owner/admin authorization
set search_path = public;

create or replace function public.upsert_cashflow(
  p_event_id uuid,
  p_kind text,
  p_label text,
  p_amount integer,
  p_pax integer default 1,
  p_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean := false;
  v_id uuid := coalesce(p_id, null);
  v_kind text := lower(coalesce(p_kind,'masuk'));
begin
  if v_uid is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if v_kind not in ('masuk','keluar') then v_kind := 'masuk'; end if;
  select exists (select 1 from public.events e where e.id = p_event_id and e.owner_id = v_uid)
         or exists (select 1 from public.event_members em where em.event_id = p_event_id and em.user_id = v_uid and em.role='admin')
    into v_ok;
  if not v_ok then raise exception 'forbidden' using errcode = '42501'; end if;

  if v_id is not null then
    update public.event_cashflows
       set kind=v_kind, label=p_label, amount=coalesce(p_amount,0), pax=greatest(coalesce(p_pax,1),1), created_by=v_uid
     where id = v_id and event_id = p_event_id
     returning id into v_id;
    if v_id is null then
      -- row not found; insert instead
      insert into public.event_cashflows(event_id, kind, label, amount, pax, created_by)
      values (p_event_id, v_kind, p_label, coalesce(p_amount,0), greatest(coalesce(p_pax,1),1), v_uid)
      returning id into v_id;
    end if;
  else
    insert into public.event_cashflows(event_id, kind, label, amount, pax, created_by)
    values (p_event_id, v_kind, p_label, coalesce(p_amount,0), greatest(coalesce(p_pax,1),1), v_uid)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.upsert_cashflow(uuid, text, text, integer, integer, uuid) to authenticated;
do $$ begin
  begin
    alter function public.upsert_cashflow(uuid, text, text, integer, integer, uuid) owner to postgres;
  exception when others then null;
  end;
end $$;

create or replace function public.delete_cashflow(
  p_event_id uuid,
  p_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean := false;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  select exists (select 1 from public.events e where e.id = p_event_id and e.owner_id = v_uid)
         or exists (select 1 from public.event_members em where em.event_id = p_event_id and em.user_id = v_uid and em.role='admin')
    into v_ok;
  if not v_ok then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.event_cashflows where id = p_id and event_id = p_event_id;
  get diagnostics v_count = ROW_COUNT;
  return v_count;
end;
$$;

grant execute on function public.delete_cashflow(uuid, uuid) to authenticated;
do $$ begin
  begin
    alter function public.delete_cashflow(uuid, uuid) owner to postgres;
  exception when others then null;
  end;
end $$;
