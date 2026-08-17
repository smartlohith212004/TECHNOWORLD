-- Run this in the Supabase SQL Editor for your project.
-- It creates the punch_records and reminder_settings tables used by the app.

create extension if not exists pgcrypto;

-- Punch records ----------------------------------------------------------
create table if not exists public.punch_records (
  id uuid primary key default gen_random_uuid(),
  demo_id text not null,
  punch_date date not null,
  session text not null check (session in ('morning','evening')),
  punched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (demo_id, punch_date, session)
);

create index if not exists punch_records_demo_date_idx
  on public.punch_records (demo_id, punch_date desc);

alter table public.punch_records enable row level security;

drop policy if exists "personal demo punch access" on public.punch_records;
create policy "personal demo punch access" on public.punch_records
  for all to anon
  using (demo_id = 'personal-demo')
  with check (demo_id = 'personal-demo');

-- Reminder settings ------------------------------------------------------
create table if not exists public.reminder_settings (
  demo_id text primary key,
  morning_time text not null default '09:30',
  evening_time text not null default '19:00',
  notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.reminder_settings enable row level security;

drop policy if exists "personal demo settings access" on public.reminder_settings;
create policy "personal demo settings access" on public.reminder_settings
  for all to anon
  using (demo_id = 'personal-demo')
  with check (demo_id = 'personal-demo');
