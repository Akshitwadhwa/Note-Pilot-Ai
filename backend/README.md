# AI Smart Timetable Backend

## Tech
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Supabase Auth token verification
- OpenAI API for note summarization

## Setup
1. Copy env values:
   - `cp .env.example .env`
2. Update `.env`:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
3. Install and generate Prisma client:
   - `npm install`
   - `npm run prisma:generate`
4. Run migrations:
   - `npm run prisma:migrate`
5. Start server:
   - `npm run dev`

## API Base
- `http://localhost:4000/api`

## Auth
- Protected endpoints require `Authorization: Bearer <supabase_access_token>`.
- On each authenticated request, backend syncs Supabase user into Prisma `User` table.

## Core Endpoints
- `GET /timetable` -> list timetable entries
- `POST /timetable` -> create timetable entry
- `GET /timetable/current` -> current active class
- `GET /notes?timetableId=...` -> notes for class
- `POST /notes` -> create note
- `POST /ai/summarize-note` -> summarize saved note

## Notes
- Timetable conflicts are blocked if class time overlaps on the same day.
- Time format for timetable entries is `HH:mm` (24-hour).
