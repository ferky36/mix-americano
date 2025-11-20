-- All-in-one, idempotent migration for Cashflow feature + Admin role
-- Safe to run multiple times. It does NOT remove existing roles or policies beyond
-- replacing the specific cashflow CUD policy and role-check constraints.

-- 0) PRAGMAS
set search_path = public;

-- Ensure pgcrypto is available for gen_random_bytes()
create extension if not exists pgcrypto;

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
  -- Replace SELECT policy to also allow event owner
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_cashflows' and policyname='event_cashflows_select_public_or_member'
  ) then
    drop policy event_cashflows_select_public_or_member on public.event_cashflows;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_cashflows' and policyname='event_cashflows_select_owner_or_member'
  ) then
    create policy event_cashflows_select_owner_or_member on public.event_cashflows
      for select using (
        exists (
          select 1 from public.events e
          where e.id = event_cashflows.event_id
            and (
              e.owner_id = auth.uid()
              or coalesce(e.is_public, true)
              or exists (
                select 1 from public.event_members em
                where em.event_id = e.id and em.user_id = auth.uid()
              )
            )
        )
      );
  end if;
end $$;

-- 3) Role checks: add 'admin' (and keep existing 'wasit' if used)
do $$ begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='event_members' and constraint_name='event_members_role_check'
  ) then
    alter table public.event_members drop constraint event_members_role_check;
  end if;
  -- Use NOT VALID to avoid blocking when historical data exists; includes 'wasit' to be backward-compatible
  alter table public.event_members
    add constraint event_members_role_check check (role = any (array['owner','editor','viewer','admin','wasit'])) not valid;
  -- Validate in case existing rows already conform (safe to run repeatedly)
  begin
    alter table public.event_members validate constraint event_members_role_check;
  exception when others then
    -- keep as NOT VALID if legacy rows exist; new rows will still be checked
    null;
  end;

  if exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='event_invites' and constraint_name='event_invites_role_check'
  ) then
    alter table public.event_invites drop constraint event_invites_role_check;
  end if;
  -- Accept 'wasit' invites too; make it NOT VALID to be reusable
  alter table public.event_invites
    add constraint event_invites_role_check check (role = any (array['viewer','editor','admin','wasit'])) not valid;
  begin
    alter table public.event_invites validate constraint event_invites_role_check;
  exception when others then
    null;
  end;
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
