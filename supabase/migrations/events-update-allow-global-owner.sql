-- Extend events UPDATE policy: allow global owner (from user_roles)
set search_path = public;

do $$
begin
  -- Drop existing update policy if present
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='events' and policyname='events_update_owner_editor_admin'
  ) then
    drop policy events_update_owner_editor_admin on public.events;
  end if;

  create policy events_update_owner_editor_admin on public.events
    for update
    using (
      -- direct event owner
      events.owner_id = auth.uid()
      -- event members with editor/admin
      or exists (
        select 1 from public.event_members em
        where em.event_id = events.id and em.user_id = auth.uid() and em.role in ('editor','admin')
      )
      -- global owner via user_roles (if table exists)
      or exists (
        select 1 from information_schema.tables t where t.table_schema='public' and t.table_name='user_roles'
      ) and exists (
        select 1 from public.user_roles ur
        where (ur.user_id = auth.uid() or lower(coalesce(ur.email,'')) = lower(coalesce(auth.email(),'')))
          and (coalesce(ur.is_owner,false) = true or lower(coalesce(ur.role,'')) in ('owner','admin'))
      )
    )
    with check (
      events.owner_id = auth.uid()
      or exists (
        select 1 from public.event_members em
        where em.event_id = events.id and em.user_id = auth.uid() and em.role in ('editor','admin')
      )
      or exists (
        select 1 from information_schema.tables t where t.table_schema='public' and t.table_name='user_roles'
      ) and exists (
        select 1 from public.user_roles ur
        where (ur.user_id = auth.uid() or lower(coalesce(ur.email,'')) = lower(coalesce(auth.email(),'')))
          and (coalesce(ur.is_owner,false) = true or lower(coalesce(ur.role,'')) in ('owner','admin'))
      )
    );
end $$;

