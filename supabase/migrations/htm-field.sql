-- Add HTM field on events and allow admin to update events
set search_path = public;

-- 1) Add column htm (idempotent)
alter table if exists public.events
  add column if not exists htm integer not null default 0 check (htm >= 0);
