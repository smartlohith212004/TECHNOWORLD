# Pulse · Attendance (plain web page)

A single self-contained web page (`index.html`) — no build step, no framework install.
It talks directly to your Supabase project. Just host the file.

## What it does
- Morning / Evening punch with Punched / Not-Punched states
- Add, edit (exact time), and delete punches — saved directly to Supabase
- Today's readiness, complete days, days to review, attendance %
- Punch history calendar with prev/next arrows + a month & year picker
- Missed-punch reminders and browser notifications
- Asia/Kolkata (IST) time handling

## One-time Supabase setup
In your Supabase project → SQL Editor, run the SQL in `../frontend/supabase_schema.sql`
(creates `punch_records` and `reminder_settings`). Your Supabase URL and anon key are
already embedded at the top of `index.html` (the anon key is a publishable, browser-safe key).

## Deploy on Vercel (zero config)
Option A — this file only (simplest):
1. Create a new GitHub repo and put `index.html` in its root.
2. In Vercel, "Add New Project" → import that repo → keep all defaults (Framework Preset: Other,
   no build command, no output directory) → Deploy.
3. Vercel serves `index.html` at the root. Done — no more 404.

Option B — deploy just this folder from a bigger repo:
- In Vercel project Settings → General → Root Directory, set it to `web`, then Redeploy.

## Run locally
Open a terminal in this folder and run any static server, e.g.:
`python3 -m http.server 3000` then visit http://localhost:3000
(Opening the file directly with file:// also works for most browsers.)
