-- Add HTM field on events and allow admin to update events
set search_path = public;

-- 1) Add column htm (idempotent)
alter table if exists public.events
  add column if not exists htm integer not null default 0 check (htm >= 0);

-- 2) Update events update policy to include 'admin' (idempotent)
do $$ begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_update_owner_or_editor'
  ) then
    drop policy events_update_owner_or_editor on public.events;
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_update_owner_editor_admin'
  ) then
    drop policy events_update_owner_editor_admin on public.events;
  end if;
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
    )
    with check (
      events.owner_id = auth.uid()
      or exists (
        select 1 from public.event_members em
        where em.event_id = events.id
          and em.user_id = auth.uid()
          and em.role in ('editor','admin')
      )
    );
end $$;


