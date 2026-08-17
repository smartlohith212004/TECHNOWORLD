# PRD — Pulse Attendance (Biometric Punch Tracker)

## Original Problem Statement
Classy, premium web app to track biometric attendance punches (morning + evening) with dashboard, reminders, history calendar, Asia/Kolkata timezone, and Supabase backend.

## Architecture
- Expo SDK 54 (React Native, web-friendly), TypeScript, expo-router.
- Data: Supabase (PostgreSQL) via `@supabase/supabase-js`. No FastAPI/Mongo used for attendance.
- Timezone: Intl.DateTimeFormat with `Asia/Kolkata`.
- Auth: deferred by user; shared `demo_id = 'personal-demo'` with anon RLS.

## Data Model (Supabase)
- `public.punch_records`: id, demo_id, punch_date, session(morning|evening), punched_at, created_at; unique(demo_id,punch_date,session).
- `public.reminder_settings`: demo_id (pk), morning_time, evening_time, notifications, updated_at.
- SQL lives in `/app/frontend/supabase_schema.sql` (run manually in Supabase SQL Editor).

## Implemented (2026-08-17)
- Supabase-ONLY persistence. Removed AsyncStorage + local/remote merge from `src/attendance.ts`.
  - getPunches/savePunch(upsert+select)/deletePunch all remote; errors surfaced to UI banner.
  - Settings now persist to Supabase `reminder_settings` (getSettings falls back to in-memory defaults if table missing).
- Replaced free-text `YYYY-MM` calendar input with a dropdown-style month/year PICKER modal (year chips + month grid), retaining prev/next arrows.
- Success/error status banner (green/red) reflects real Supabase outcomes; no false "saved on device" success.
- Busy states on punch/edit/delete/save buttons.

## Backlog
- P0: User must run updated SQL to create `reminder_settings` for settings persistence.
- P1: Real authentication + per-user RLS (replace demo_id with auth.uid()).
- P2: Native/browser notification validation on real devices.

## Next Tasks
- Confirm reminder_settings table created; verify settings save round-trip.
- Optional: auth rollout.
