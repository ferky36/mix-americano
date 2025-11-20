-- Supabase bootstrap script (idempotent)
-- Jalankan seluruh isi file ini di SQL Editor Supabase atau lewat psql.
-- Semua perintah aman diulang.

set search_path = public;
create extension if not exists pgcrypto;

-- ===== Mulai definisi inti =====

-- ===== BEGIN migrations/struktur-table.sql =====

create table if not exists public.events (
  id uuid not null default gen_random_uuid (),
  slug text null,
  title text null,
  is_public boolean null default true,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  event_name text not null,
  event_date date not null,
  owner_id uuid null,
  constraint events_pkey primary key (id),
  constraint events_unique_name_date unique (event_date, event_name)
) TABLESPACE pg_default;

create index IF not exists events_owner_id_idx on public.events using btree (owner_id) TABLESPACE pg_default;


create table if not exists public.event_members (
  event_id uuid not null,
  user_id uuid not null,
  role text not null,
  constraint event_members_pkey primary key (event_id, user_id),
  constraint event_members_event_user_key unique (event_id, user_id),
  constraint event_members_event_id_fkey foreign KEY (event_id) references events (id) on delete CASCADE,
  constraint event_members_role_check check (
    (
      role = any (
        array['owner'::text, 'editor'::text, 'viewer'::text, 'admin'::text, 'wasit'::text]
      )
    )
  )
) TABLESPACE pg_default;


create table if not exists public.event_invites (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null,
  email text not null,
  role text not null default 'viewer'::text,
  token text not null,
  created_at timestamp with time zone not null default now(),
  accepted_at timestamp with time zone null,
  constraint event_invites_pkey primary key (id),
  constraint event_invites_token_key unique (token),
  constraint event_invites_event_id_fkey foreign KEY (event_id) references events (id) on delete CASCADE,
  constraint event_invites_role_check check (
    (
      role = any (array['viewer'::text, 'editor'::text, 'admin'::text, 'wasit'::text])
    )
  )
) TABLESPACE pg_default;


create table if not exists public.event_states (
  id uuid not null default gen_random_uuid (),
  event_id uuid null,
  session_date date not null,
  state jsonb not null,
  version integer not null default 1,
  updated_by uuid null,
  updated_at timestamp with time zone null default now(),
  constraint event_states_pkey primary key (id),
  constraint event_states_event_id_session_date_key unique (event_id, session_date),
  constraint event_states_event_id_fkey foreign KEY (event_id) references events (id) on delete CASCADE
) TABLESPACE pg_default;

-- Helper function to determine global owner/admin without requiring user_roles table
create or replace function public.is_global_owner()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
  v_exists boolean := false;
  v_sql text;
begin
  if v_uid is null then
    return false;
  end if;

  if to_regclass('public.user_roles') is null then
    return false;
  end if;

  v_sql := '
    select exists (
      select 1 from public.user_roles
      where (user_id = $1 or lower(coalesce(email, '''')) = $2)
        and (coalesce(is_owner,false) = true or lower(coalesce(role, '''')) in (''owner'',''admin''))
    )';

  execute v_sql into v_exists using v_uid, v_email;

  return coalesce(v_exists, false);
exception when others then
  return false;
end;
$$;


-- Simple location fields for events (idempotent)
alter table if exists public.events
  add column if not exists location_text text;

alter table if exists public.events
  add column if not exists location_url text;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_set_event_owner'
  ) and exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_event_owner'
  ) then
    create trigger trg_set_event_owner BEFORE INSERT on events for EACH row
    execute FUNCTION public.set_event_owner ();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_ensure_event_owner_membership'
  ) and exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ensure_event_owner_membership'
  ) then
    create trigger trg_ensure_event_owner_membership
    after INSERT on events for EACH row
    execute FUNCTION public.ensure_event_owner_membership ();
  end if;
end $$;


-- =========================
-- Row Level Security (RLS)
-- =========================

-- Enable RLS (idempotent)
alter table if exists public.events         enable row level security;
alter table if exists public.event_states   enable row level security;
alter table if exists public.event_members  enable row level security;
alter table if exists public.event_invites  enable row level security;


-- Helper policies are created only if absent (safe to rerun)
-- EVENTS: readable if public or user is a member
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_select_public_or_member'
  ) then
    create policy events_select_public_or_member on public.events
      for select
      using (
        coalesce(is_public, true)
        or exists (
          select 1 from public.event_members em
          where em.event_id = events.id
            and em.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Enforce final UPDATE policy allowing owner/editor/admin or global owner controls
drop policy if exists events_update_owner_or_editor on public.events;
drop policy if exists events_update_owner_editor_admin on public.events;

create policy events_update_owner_editor_admin on public.events
  for update
  using (
    events.owner_id = auth.uid()
    or exists (
      select 1 from public.event_members em
      where em.event_id = events.id
        and em.user_id = auth.uid()
        and em.role in ('editor','admin')
    )
    or public.is_global_owner()
  )
  with check (
    events.owner_id = auth.uid()
    or exists (
      select 1 from public.event_members em
      where em.event_id = events.id
        and em.user_id = auth.uid()
        and em.role in ('editor','admin')
    )
    or public.is_global_owner()
  );


-- EVENT_STATES: read if event public or user is a member; write if owner/editor
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_states' and policyname = 'event_states_select_public_or_member'
  ) then
    create policy event_states_select_public_or_member on public.event_states
      for select
      using (
        exists (
          select 1 from public.events e
          where e.id = event_states.event_id
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_states' and policyname = 'event_states_insert_editor_or_owner'
  ) then
    create policy event_states_insert_editor_or_owner on public.event_states
      for insert
      with check (
        exists (
          select 1 from public.event_members em
          where em.event_id = event_states.event_id
            and em.user_id = auth.uid()
            and em.role in ('owner','editor','wasit')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_states' and policyname = 'event_states_update_editor_or_owner'
  ) then
    create policy event_states_update_editor_or_owner on public.event_states
      for update
      using (
        exists (
          select 1 from public.event_members em
          where em.event_id = event_states.event_id
            and em.user_id = auth.uid()
            and em.role in ('owner','editor','wasit')
        )
      )
      with check (
        exists (
          select 1 from public.event_members em
          where em.event_id = event_states.event_id
            and em.user_id = auth.uid()
            and em.role in ('owner','editor','wasit')
        )
      );
  end if;
end $$;


-- EVENT_MEMBERS: user reads own rows; owner reads their event members; user can upsert own row if invited
do $$ begin
  -- Replace with self-only read to avoid recursion across events <-> event_members
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_members' and policyname = 'event_members_select_self_or_owner'
  ) then
    drop policy event_members_select_self_or_owner on public.event_members;
  end if;
  create policy event_members_select_self_or_owner on public.event_members
    for select
    using (
      user_id = auth.uid()
    );

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_members' and policyname = 'event_members_insert_self_if_invited'
  ) then
    create policy event_members_insert_self_if_invited on public.event_members
      for insert
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.event_invites inv
          where inv.event_id = event_members.event_id
            and lower(inv.email) = lower(auth.email())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_members' and policyname = 'event_members_update_self_if_invited'
  ) then
    create policy event_members_update_self_if_invited on public.event_members
      for update
      using (
        user_id = auth.uid()
        and exists (
          select 1 from public.event_invites inv
          where inv.event_id = event_members.event_id
            and lower(inv.email) = lower(auth.email())
        )
      )
      with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.event_invites inv
          where inv.event_id = event_members.event_id
            and lower(inv.email) = lower(auth.email())
        )
      );
  end if;
end $$;


-- EVENT_INVITES: user can see/update invites for their own email (fallback accept flow)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_invites' and policyname = 'event_invites_select_self_email'
  ) then
    create policy event_invites_select_self_email on public.event_invites
      for select
      using ( lower(email) = lower(auth.email()) );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_invites' and policyname = 'event_invites_update_accept_self'
  ) then
    create policy event_invites_update_accept_self on public.event_invites
      for update
      using ( lower(email) = lower(auth.email()) )
      with check ( lower(email) = lower(auth.email()) );
  end if;
end $$;


-- =========================
-- Join/Leave RPCs + Columns
-- =========================

-- Optional flags on events (non-breaking defaults, idempotent)
alter table if exists public.events
  add column if not exists allow_public_join boolean default true;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='events' and column_name='allow_public_join'
  ) then
    update public.events set allow_public_join = true where allow_public_join is null;
    begin
      alter table public.events alter column allow_public_join set not null;
    exception when others then
      -- ignore if cannot set not null yet
      null;
    end;
  end if;
end $$;

alter table if exists public.events
  add column if not exists max_players integer;

-- request_join_event RPC
create or replace function public.request_join_event(
  p_event_id uuid,
  p_session_date date,
  p_name text,
  p_gender text,
  p_level text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_allow boolean := true;
  v_max int := null;
  v_state jsonb := '{}'::jsonb;
  v_version int := 0;
  v_players_text text := '';
  v_waiting_text text := '';
  v_player_meta jsonb := '{}'::jsonb;
  v_count int := 0;
  v_already_name text := null;
  v_name text := coalesce(trim(p_name), '');
  v_now timestamptz := now();
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    return jsonb_build_object('status','unauthorized');
  end if;

  select coalesce(allow_public_join,true), max_players
    into v_allow, v_max
  from public.events
  where id = p_event_id;
  if not found then
    return jsonb_build_object('status','not_found');
  end if;
  if not v_allow then
    if not exists (
      select 1 from public.event_members em
      where em.event_id = p_event_id and em.user_id = v_uid
    ) then
      return jsonb_build_object('status','closed');
    end if;
  end if;

  select state, coalesce(version,0)
    into v_state, v_version
  from public.event_states
  where event_id = p_event_id
    and session_date = p_session_date;
  if not found or v_state is null then
    v_state := '{}'::jsonb;
    v_version := 0;
  end if;

  v_players_text := coalesce(v_state->>'players','');
  v_waiting_text := coalesce(v_state->>'waitingList','');
  v_player_meta := coalesce(v_state->'playerMeta','{}'::jsonb);

  select key into v_already_name
  from jsonb_each(v_player_meta) as t(key, val)
  where (val->>'uid') = v_uid::text
  limit 1;
  if v_already_name is not null then
    return jsonb_build_object('status','already','name',v_already_name);
  end if;

  if v_max is not null then
    select count(*) into v_count
    from unnest(regexp_split_to_array(v_players_text, E'\r?\n')) as a(x)
    where length(trim(x)) > 0;
    if v_count >= v_max then
      -- if already in waiting list, return 'already'
      if exists (
        select 1 from unnest(regexp_split_to_array(v_waiting_text, E'\r?\n')) as a(x)
        where lower(trim(x)) = lower(v_name)
      ) then
        return jsonb_build_object('status','already','name',v_name);
      end if;
      -- push to waiting list instead of rejecting
      if not exists (
        select 1 from unnest(regexp_split_to_array(v_waiting_text, E'\r?\n')) as a(x)
        where lower(trim(x)) = lower(v_name)
      ) then
        if length(trim(coalesce(v_waiting_text,''))) = 0 then
          v_waiting_text := v_name;
        else
          v_waiting_text := v_waiting_text || E'\n' || v_name;
        end if;
      end if;

      v_player_meta := coalesce(v_player_meta, '{}'::jsonb)
        || jsonb_build_object(
             v_name,
             jsonb_strip_nulls(
               jsonb_build_object(
                 'uid',   v_uid::text,
                 'gender', p_gender,
                 'level',  p_level
               )
             )
           );

      v_state := jsonb_set(v_state, '{waitingList}', to_jsonb(v_waiting_text), true);
      v_state := jsonb_set(v_state, '{playerMeta}', v_player_meta, true);

      insert into public.event_states(event_id, session_date, state, version, updated_at)
      values (p_event_id, p_session_date, v_state, v_version + 1, v_now)
      on conflict (event_id, session_date)
      do update set
        state = excluded.state,
        version = public.event_states.version + 1,
        updated_at = excluded.updated_at;

      insert into public.event_members(event_id, user_id, role)
      values (p_event_id, v_uid, 'viewer')
      on conflict (event_id, user_id) do nothing;

      return jsonb_build_object('status','waitlisted','name',v_name);
    end if;
  end if;

  if exists (
    select 1
    from jsonb_each(v_player_meta) as t(key, val)
    where lower(key) = lower(v_name)
      and coalesce(val->>'uid','') <> v_uid::text
  ) then
    return jsonb_build_object('status','already','name',v_name);
  end if;

  if not exists (
    select 1
    from unnest(regexp_split_to_array(v_players_text, E'\r?\n')) as a(x)
    where lower(trim(x)) = lower(v_name)
  ) then
    if length(trim(coalesce(v_players_text,''))) = 0 then
      v_players_text := v_name;
    else
      v_players_text := v_players_text || E'\n' || v_name;
    end if;
  end if;

  v_player_meta := coalesce(v_player_meta, '{}'::jsonb)
    || jsonb_build_object(
         v_name,
         jsonb_strip_nulls(
           jsonb_build_object(
             'uid',   v_uid::text,
             'gender', p_gender,
             'level',  p_level
           )
         )
       );

  v_state := jsonb_set(v_state, '{players}', to_jsonb(v_players_text), true);
  v_state := jsonb_set(v_state, '{waitingList}', to_jsonb(coalesce(v_waiting_text,'')), true);
  v_state := jsonb_set(v_state, '{playerMeta}', v_player_meta, true);

  insert into public.event_states(event_id, session_date, state, version, updated_at)
  values (p_event_id, p_session_date, v_state, v_version + 1, v_now)
  on conflict (event_id, session_date)
  do update set
    state = excluded.state,
    version = public.event_states.version + 1,
    updated_at = excluded.updated_at;

  insert into public.event_members(event_id, user_id, role)
  values (p_event_id, v_uid, 'viewer')
  on conflict (event_id, user_id) do nothing;

  return jsonb_build_object('status','joined','name',v_name);
end;
$$;

-- request_leave_event RPC
create or replace function public.request_leave_event(
  p_event_id uuid,
  p_session_date date
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_state jsonb := '{}'::jsonb;
  v_version int := 0;
  v_players_text text := '';
  v_waiting_text text := '';
  v_player_meta jsonb := '{}'::jsonb;
  v_name text := null;
  v_promote text := null;
  v_max int := null;
  v_count int := 0;
  v_now timestamptz := now();
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    return jsonb_build_object('status','unauthorized');
  end if;

  select state, coalesce(version,0)
    into v_state, v_version
  from public.event_states
  where event_id = p_event_id
    and session_date = p_session_date;

  if not found or v_state is null then
    return jsonb_build_object('status','not_joined');
  end if;

  v_players_text := coalesce(v_state->>'players','');
  v_waiting_text := coalesce(v_state->>'waitingList','');
  v_player_meta := coalesce(v_state->'playerMeta','{}'::jsonb);

  select key into v_name
  from jsonb_each(v_player_meta) as t(key, val)
  where (val->>'uid') = v_uid::text
  limit 1;

  if v_name is null then
    return jsonb_build_object('status','not_joined');
  end if;

  with arr as (
    select regexp_split_to_array(v_players_text, E'\r?\n') as a
  )
  select array_to_string(
           array(
             select x from unnest((select a from arr)) as x
             where lower(trim(x)) <> lower(v_name)
           ),
           E'\n'
         )
    into v_players_text;

  with arr as (
    select regexp_split_to_array(v_waiting_text, E'\r?\n') as a
  )
  select array_to_string(
           array(
             select x from unnest((select a from arr)) as x
             where lower(trim(x)) <> lower(v_name)
           ),
           E'\n'
         )
    into v_waiting_text;

  v_player_meta := v_player_meta - v_name;

  -- Auto promote top waiting if capacity allows
  select max_players into v_max from public.events where id = p_event_id;
  if v_max is null then
    -- unlimited mode: promote if any waiting
    select x into v_promote
    from unnest(regexp_split_to_array(v_waiting_text, E'\r?\n')) as a(x)
    where length(trim(x))>0
    limit 1;
  else
    select count(*) into v_count
    from unnest(regexp_split_to_array(v_players_text, E'\r?\n')) as a(x)
    where length(trim(x))>0;
    if v_count < v_max then
      select x into v_promote
      from unnest(regexp_split_to_array(v_waiting_text, E'\r?\n')) as a(x)
      where length(trim(x))>0
      limit 1;
    end if;
  end if;

  if v_promote is not null then
    -- ensure not duplicate in players (case-insensitive)
    if not exists (
      select 1
      from unnest(regexp_split_to_array(v_players_text, E'\r?\n')) as a(x)
      where lower(trim(x)) = lower(trim(v_promote))
    ) then
      if length(trim(coalesce(v_players_text,''))) = 0 then
        v_players_text := trim(v_promote);
      else
        v_players_text := v_players_text || E'\n' || trim(v_promote);
      end if;
    end if;
    -- remove promoted from waiting list
    with arr as (
      select regexp_split_to_array(v_waiting_text, E'\r?\n') as a
    )
    select array_to_string(
             array(
               select x from unnest((select a from arr)) as x
               where lower(trim(x)) <> lower(trim(v_promote))
             ),
             E'\n'
           )
      into v_waiting_text;
  end if;

  v_state := jsonb_set(v_state, '{players}', to_jsonb(coalesce(v_players_text,'')), true);
  v_state := jsonb_set(v_state, '{waitingList}', to_jsonb(coalesce(v_waiting_text,'')), true);
  v_state := jsonb_set(v_state, '{playerMeta}', v_player_meta, true);

  insert into public.event_states(event_id, session_date, state, version, updated_at)
  values (p_event_id, p_session_date, v_state, v_version + 1, v_now)
  on conflict (event_id, session_date)
  do update set
    state = excluded.state,
    version = public.event_states.version + 1,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status','left','name',v_name, 'promoted', coalesce(v_promote, null));
end;
$$;

-- Grants
grant execute on function public.request_join_event(uuid, date, text, text, text) to authenticated;
grant execute on function public.request_leave_event(uuid, date) to authenticated;

-- Delete event RPC (owner-only or global owner via user_roles)
create or replace function public.delete_event(
  p_event_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_is_global_owner boolean;
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    return jsonb_build_object('status','unauthorized');
  end if;

  -- Determine event creator/owner
  select owner_id into v_owner from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('status','not_found');
  end if;

  -- Check global owner via helper (safe even if user_roles table absent)
  v_is_global_owner := public.is_global_owner();

  -- Allow delete if direct owner or global owner
  if v_owner <> v_uid and not v_is_global_owner then
    return jsonb_build_object('status','forbidden');
  end if;

  delete from public.events where id = p_event_id;
  -- cascades to event_states, event_members, event_invites via FK ON DELETE CASCADE
  return jsonb_build_object('status','deleted');
end;
$$;

grant execute on function public.delete_event(uuid) to authenticated;

-- ===== END migrations/struktur-table.sql =====

-- ===== BEGIN migrations/htm-field.sql =====

-- Add HTM field on events and allow admin to update events
set search_path = public;

-- 1) Add column htm (idempotent)
alter table if exists public.events
  add column if not exists htm integer not null default 0 check (htm >= 0);

-- ===== END migrations/htm-field.sql =====

-- ===== BEGIN migrations/cashflow-admin-all.sql =====

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

-- ===== END migrations/cashflow-admin-all.sql =====

-- ===== BEGIN migrations/cashflow-rpc.sql =====

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

-- ===== END migrations/cashflow-rpc.sql =====

-- ===== BEGIN migrations/paid-cashflow-rpc.sql =====

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

-- ===== END migrations/paid-cashflow-rpc.sql =====

-- ===== BEGIN migrations/create-invite-global-owner.sql =====

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

-- ===== END migrations/create-invite-global-owner.sql =====
