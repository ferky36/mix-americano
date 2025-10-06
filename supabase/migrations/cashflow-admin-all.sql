-- All-in-one, idempotent migration for Cashflow feature + Admin role
-- Safe to run multiple times. It does NOT remove existing roles or policies beyond
-- replacing the specific cashflow CUD policy and role-check constraints.

-- 0) PRAGMAS
set search_path = public;

-- 1) Table: event_cashflows (if absent)
create table if not exists public.event_cashflows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  t date null,
  kind text not null check (kind in ('masuk','keluar')),
  label text not null,
  amount integer not null check (amount >= 0),
  pax integer not null default 1 check (pax >= 1),
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists event_cashflows_event_id_idx   on public.event_cashflows(event_id);
create index if not exists event_cashflows_event_kind_idx on public.event_cashflows(event_id, kind);
create index if not exists event_cashflows_date_idx       on public.event_cashflows(t);

alter table if exists public.event_cashflows enable row level security;

-- 2) SELECT policy for cashflows (public OR member of event)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='event_cashflows' and policyname='event_cashflows_select_public_or_member'
  ) then
    create policy event_cashflows_select_public_or_member on public.event_cashflows
      for select using (
        exists (
          select 1 from public.events e
          where e.id = event_cashflows.event_id
            and (
              coalesce(e.is_public, true)
              or exists (
                select 1 from public.event_members em
                where em.event_id = e.id and em.user_id = auth.uid()
              )
            )
        )
      );
  end if;
end $$;

-- 3) Role checks: add 'admin' (does not remove existing roles)
do $$ begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='event_members' and constraint_name='event_members_role_check'
  ) then
    alter table public.event_members drop constraint event_members_role_check;
  end if;
  alter table public.event_members
    add constraint event_members_role_check check (role = any (array['owner','editor','viewer','admin']));

  if exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='event_invites' and constraint_name='event_invites_role_check'
  ) then
    alter table public.event_invites drop constraint event_invites_role_check;
  end if;
  alter table public.event_invites
    add constraint event_invites_role_check check (role = any (array['viewer','editor','admin']));
end $$;

-- 4) CUD policy for cashflows: only owner or 'admin'
do $$ begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_cashflows' and policyname='event_cashflows_cud_owner_or_editor'
  ) then
    drop policy event_cashflows_cud_owner_or_editor on public.event_cashflows;
  end if;
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_cashflows' and policyname='event_cashflows_cud_owner_or_admin'
  ) then
    drop policy event_cashflows_cud_owner_or_admin on public.event_cashflows;
  end if;
  create policy event_cashflows_cud_owner_or_admin on public.event_cashflows
    for all
    using (
      exists (select 1 from public.events e where e.id = event_cashflows.event_id and e.owner_id = auth.uid())
      or exists (
        select 1 from public.event_members em
        where em.event_id = event_cashflows.event_id and em.user_id = auth.uid() and em.role = 'admin'
      )
    )
    with check (
      exists (select 1 from public.events e where e.id = event_cashflows.event_id and e.owner_id = auth.uid())
      or exists (
        select 1 from public.event_members em
        where em.event_id = event_cashflows.event_id and em.user_id = auth.uid() and em.role = 'admin'
      )
    );
end $$;

-- 5) Recreate RPC create_event_invite to allow role 'admin' (owner/editor can issue)
do $$
declare
  rec record;
begin
  -- Drop ANY overload of create_event_invite in public schema to avoid 42P13
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
  v_token text := encode(gen_random_bytes(16), 'hex');
  v_ok boolean := false;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if v_role not in ('viewer','editor','admin') then
    v_role := 'viewer';
  end if;

  -- issue invites: owner OR editor (unchanged)
  select exists (
           select 1 from public.events e where e.id = p_event_id and e.owner_id = v_uid
         )
      or exists (
           select 1 from public.event_members em where em.event_id = p_event_id and em.user_id = v_uid and em.role in ('owner','editor')
         )
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
