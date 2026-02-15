# Note-Pilot AI

A full-stack student productivity app for managing weekly classes, taking notes during lectures, and generating AI-powered summaries.

This repository is a monorepo with:
- `frontend`: React + TypeScript + Vite app
- `backend`: Express + TypeScript + Prisma API

## Highlights
- Weekly timetable management
- Current class and next class views
- Notes tied to timetable entries
- AI summary generation for notes (OpenAI)
- Supabase-authenticated backend endpoints

## Project Structure
```text
.
├── backend/   # Express API, Prisma schema, business logic
└── frontend/  # React app, pages/components, feature APIs
```

## Tech Stack
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Axios
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod
- Auth: Supabase
- AI: OpenAI Chat Completions API

## Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm
- PostgreSQL database
- Supabase project (for auth)
- OpenAI API key (optional unless using AI summary endpoints)

## Quick Start

### 1) Backend setup
```bash
cd backend
npm install
cp .env.example .env
```

Set values in `backend/.env`:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional if AI endpoints are not used)
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)

Then run:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend runs at `http://localhost:4000` and API base is `http://localhost:4000/api`.

### 2) Frontend setup
Open a new terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set values in `frontend/.env`:
- `VITE_API_BASE_URL` (default `http://localhost:4000/api`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Frontend runs at `http://localhost:5173` by default.

## Available Scripts

### Frontend (`frontend/package.json`)
- `npm run dev`: start Vite dev server
- `npm run build`: type-check + production build
- `npm run lint`: run ESLint
- `npm run preview`: preview production build

### Backend (`backend/package.json`)
- `npm run dev`: run API in dev mode
- `npm run build`: compile TypeScript to `dist/`
- `npm run start`: run compiled server
- `npm run typecheck`: TypeScript checks
- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:migrate`: run/create migrations
- `npm run prisma:studio`: open Prisma Studio

## API Overview
Base URL: `/api`

Public:
- `GET /health`
- `POST /users/register`

Protected (Bearer token required):
- `GET /timetable`
- `POST /timetable`
- `GET /timetable/current`
- `GET /notes?timetableId=...`
- `POST /notes`
- `POST /ai/summarize`
- `POST /ai/summarize-note`

## Authentication
- Backend validates Supabase access tokens from `Authorization: Bearer <token>`.
- On authenticated requests, backend syncs the Supabase user into the Prisma `User` table.

## Current Development Status
- Frontend timetable and notes feature APIs are currently using in-memory mock data in:
  - `frontend/src/features/timetable/api.ts`
  - `frontend/src/features/notes/api.ts`
- `frontend/src/context/AuthContext.tsx` currently seeds a mock session for development while the live Supabase session effect is commented out.

This means the UI can run quickly in a demo mode, while backend endpoints are available separately.

## Notes
- Time format for timetable entries is `HH:mm` (24-hour).
- Timetable conflicts are blocked in backend business logic when classes overlap on the same day.
- AI summarization endpoints return an error if `OPENAI_API_KEY` is missing.

## License
No license file is currently included in this repository.
