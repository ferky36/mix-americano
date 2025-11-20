-- RPC helpers for syncing player paid flag to cashflow
-- Idempotent and safe to run multiple times
set search_path = public;

-- Upsert income row when a player is marked as paid
create or replace function public.add_paid_income(
  p_event_id uuid,
  p_label text,
  p_amount integer,
  p_pax integer default 1
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := null;
  v_ok boolean := false;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  -- allow owner or admin member
  select exists (select 1 from public.events e where e.id = p_event_id and e.owner_id = v_uid)
         or exists (select 1 from public.event_members em where em.event_id = p_event_id and em.user_id = v_uid and em.role = 'admin')
    into v_ok;
  if not v_ok then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id into v_id from public.event_cashflows
   where event_id = p_event_id and kind = 'masuk' and label = p_label
   limit 1;
  if v_id is not null then
    update public.event_cashflows
       set amount = coalesce(p_amount,0), pax = greatest(coalesce(p_pax,1),1), created_by = v_uid
     where id = v_id;
    return v_id;
  else
    insert into public.event_cashflows(event_id, kind, label, amount, pax, created_by)
    values (p_event_id, 'masuk', p_label, coalesce(p_amount,0), greatest(coalesce(p_pax,1),1), v_uid)
    returning id into v_id;
    return v_id;
  end if;
end;
$$;

grant execute on function public.add_paid_income(uuid, text, integer, integer) to authenticated;
do $$ begin
  begin
    alter function public.add_paid_income(uuid, text, integer, integer) owner to postgres;
  exception when others then null;
  end;
end $$;

-- Remove income row when a player is unmarked as paid
create or replace function public.remove_paid_income(
  p_event_id uuid,
  p_label text
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
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  -- allow owner or admin member
  select exists (select 1 from public.events e where e.id = p_event_id and e.owner_id = v_uid)
         or exists (select 1 from public.event_members em where em.event_id = p_event_id and em.user_id = v_uid and em.role = 'admin')
    into v_ok;
  if not v_ok then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.event_cashflows where event_id = p_event_id and kind = 'masuk' and label = p_label;
  get diagnostics v_count = ROW_COUNT;
  return v_count;
end;
$$;

grant execute on function public.remove_paid_income(uuid, text) to authenticated;
do $$ begin
  begin
    alter function public.remove_paid_income(uuid, text) owner to postgres;
  exception when others then null;
  end;
end $$;
