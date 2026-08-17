# PulseBiometric Attendance Tracker

## Problem statement
Build a premium, low-friction attendance companion that makes it immediately obvious whether the user recorded the morning and evening biometric punches, while preserving exact times, reminders, history, and summary insights in Asia/Kolkata time.

## Architecture
- Expo Router / React Native UI with React Native Web preview, compatible with iOS and Android.
- Supabase JavaScript client for the `punch_records` table, with a persistent AsyncStorage fallback and merge-on-read strategy.
- Supabase SQL schema in `/app/frontend/supabase_schema.sql`; first version intentionally skips authentication and uses a personal demo identifier.
- Asia/Kolkata formatting at display and date-boundary logic; timestamps remain ISO/UTC internally.

## User personas
- A busy professional who needs a one-glance morning/evening punch checklist.
- A detail-oriented user who occasionally corrects a punch time and reviews missed days.

## Core requirements (static)
- Daily morning and evening punch controls with duplicate prevention.
- Exact date/time persistence, edit, and delete.
- Reminder banners and configurable morning/evening reminder times.
- Browser notification permission request where supported.
- History filtering, missed-day visibility, and attendance summary.
- Premium, responsive, accessible mobile-first UI.

## Implemented (2026-08-17)
- Replaced starter screen with Pulse dashboard, hero readiness indicator, IST date, punch cards, status pills, and summary cards.
- Added Supabase client configuration, punch data layer, AsyncStorage persistence, and remote/local merge behavior for reliable reloads.
- Added edit time modal, delete confirmation, history view with YYYY-MM filter, settings modal, reminder preferences, and notification toggle.
- Replaced the separate history entry list with a month calendar view, previous/next month navigation, and morning/evening status dots per day.
- Fixed calendar month parsing so Asia/Kolkata dates no longer shift backward into the previous UTC month; today’s punch dots now map to the correct date.
- Replaced web-unreliable delete alerts with an explicit confirmation modal; punch saves now await Supabase upsert and show synced-versus-local status, while deletes clear the UI immediately and report remote failures.
- Added SQL schema with unique session constraint and RLS policy for the selected no-auth personal demo mode.
- Verified Expo preview load, morning punch, history, settings, notification selector, and punch persistence after reload; JavaScript lint is clean.

## Prioritized backlog
1. P0: Run `supabase_schema.sql` in the Supabase SQL editor and confirm remote rows are visible.
2. P1: Add Supabase Auth and owner-scoped RLS before using this for sensitive or multi-device attendance.
3. P1: Add true scheduled reminders with Expo Notifications on native devices and a service worker scheduler on web.
4. P2: Add calendar/month range filtering and a compact weekly bar chart.
5. P2: Add dark mode and export/shareable monthly attendance reports.

## P0/P1/P2 remaining
- P0: Supabase schema deployment/verification — completed and verified with a live punch sync on 2026-08-17.
- P1: Authenticated ownership, production RLS, native scheduled notifications.
- P2: Advanced analytics, theme polish, exports.

## Next tasks
- Execute the provided SQL schema, verify insert/update/delete against Supabase, then migrate from `personal-demo` to authenticated `owner_id` policies.
- Add native notification scheduling after the authenticated data flow is approved.