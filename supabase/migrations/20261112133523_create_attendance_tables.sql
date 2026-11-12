/*
# Create attendance tables (shared demo, no sign-in)

1. New Tables
- `punch_records`: one row per morning or evening punch for a given date (demo_id, punch_date, session, punched_at, created_at). Unique per demo, date and session.
- `reminder_settings`: reminder times and notification preference per demo (demo_id primary key).

2. Security
- Row level security enabled on both tables.
- The app has no sign-in, so access is granted to the anon and authenticated roles, limited to rows where demo_id = 'personal-demo'.
- Separate select, insert, update and delete policies for each table.
- Grants limited to the verbs the app uses.

3. Notes
- Idempotent: safe to re-run.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.punch_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id text NOT NULL,
  punch_date date NOT NULL,
  session text NOT NULL CHECK (session IN ('morning','evening')),
  punched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demo_id, punch_date, session)
);

CREATE INDEX IF NOT EXISTS punch_records_demo_date_idx ON public.punch_records (demo_id, punch_date DESC);

ALTER TABLE public.punch_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.punch_records TO anon, authenticated;

DROP POLICY IF EXISTS "personal demo punch select" ON public.punch_records;
CREATE POLICY "personal demo punch select" ON public.punch_records FOR SELECT
  TO anon, authenticated USING (demo_id = 'personal-demo');

DROP POLICY IF EXISTS "personal demo punch insert" ON public.punch_records;
CREATE POLICY "personal demo punch insert" ON public.punch_records FOR INSERT
  TO anon, authenticated WITH CHECK (demo_id = 'personal-demo');

DROP POLICY IF EXISTS "personal demo punch update" ON public.punch_records;
CREATE POLICY "personal demo punch update" ON public.punch_records FOR UPDATE
  TO anon, authenticated USING (demo_id = 'personal-demo') WITH CHECK (demo_id = 'personal-demo');

DROP POLICY IF EXISTS "personal demo punch delete" ON public.punch_records;
CREATE POLICY "personal demo punch delete" ON public.punch_records FOR DELETE
  TO anon, authenticated USING (demo_id = 'personal-demo');

CREATE TABLE IF NOT EXISTS public.reminder_settings (
  demo_id text PRIMARY KEY,
  morning_time text NOT NULL DEFAULT '09:30',
  evening_time text NOT NULL DEFAULT '19:00',
  notifications boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_settings TO anon, authenticated;

DROP POLICY IF EXISTS "personal demo settings select" ON public.reminder_settings;
CREATE POLICY "personal demo settings select" ON public.reminder_settings FOR SELECT
  TO anon, authenticated USING (demo_id = 'personal-demo');

DROP POLICY IF EXISTS "personal demo settings insert" ON public.reminder_settings;
CREATE POLICY "personal demo settings insert" ON public.reminder_settings FOR INSERT
  TO anon, authenticated WITH CHECK (demo_id = 'personal-demo');

DROP POLICY IF EXISTS "personal demo settings update" ON public.reminder_settings;
CREATE POLICY "personal demo settings update" ON public.reminder_settings FOR UPDATE
  TO anon, authenticated USING (demo_id = 'personal-demo') WITH CHECK (demo_id = 'personal-demo');

DROP POLICY IF EXISTS "personal demo settings delete" ON public.reminder_settings;
CREATE POLICY "personal demo settings delete" ON public.reminder_settings FOR DELETE
  TO anon, authenticated USING (demo_id = 'personal-demo');
