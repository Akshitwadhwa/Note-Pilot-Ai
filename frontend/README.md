# AI Smart Timetable Frontend

## Tech
- React + TypeScript + Vite
- Tailwind CSS
- TanStack Query + Axios + React Router
- Supabase Auth

## Setup
1. `npm install`
2. `cp .env.example .env`
3. Fill Supabase values in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Ensure backend is running on `VITE_API_BASE_URL` (default `http://localhost:4000/api`)
5. `npm run dev`

## Frontend Architecture
- `src/app` -> app providers and router
- `src/components` -> reusable UI sections
- `src/features` -> API modules grouped by domain (`timetable`, `notes`)
- `src/lib` -> API client + Supabase client
- `src/pages` -> route-level screens
- `src/types` -> shared domain types

## Main Flow
1. Sign up or sign in with Supabase email/password.
2. Access token is attached as `Bearer` auth on API calls.
3. Add timetable entries.
4. App detects current class automatically.
5. Create notes and generate AI summaries.

## Session Behavior
- Session persistence is disabled (`persistSession: false`) to avoid localStorage usage.
- Reloading the page requires signing in again.
