create extension if not exists pgcrypto;
create table if not exists public.punch_records (
  id uuid primary key default gen_random_uuid(),
  demo_id text not null,
  punch_date date not null,
  session text not null check (session in ('morning','evening')),
  punched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (demo_id, punch_date, session)
);
alter table public.punch_records enable row level security;
create policy "personal demo punch access" on public.punch_records for all to anon using (demo_id = 'personal-demo') with check (demo_id = 'personal-demo');