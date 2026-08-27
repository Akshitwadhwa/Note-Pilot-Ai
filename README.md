# Note-Pilot AI

Note-Pilot AI is a full-stack academic productivity platform for managing timetables, notes, course materials, quizzes, assignments, and Google Classroom updates in one workspace.

## Features

- Timetable creation, editing, deletion, and image import
- Notes linked to timetable classes and session dates
- Google Classroom OAuth and synchronization
- Classroom announcements, assignments, quizzes, and Drive attachments
- PDF text extraction and AI material analysis
- Course handout upload with syllabus, credits, and evaluation extraction
- RAG-based questions over course handouts
- AI summaries, study packs, quizzes, and quiz attempts
- Dashboard alerts for assignments and quizzes

## Planned

The next major feature is a live voice AI co-teacher using Agora for real-time classroom audio. It will use Google Classroom materials, teacher notes, timetable context, and the RAG pipeline to answer student questions, run spoken quizzes, identify learning gaps, and produce post-class summaries. Teachers will be able to control or mute the AI.

## Architecture

```text
React + TypeScript + Vite
          ↓ REST API
Node.js + Express + TypeScript
          ↓
Drizzle ORM + PostgreSQL
          ↓
Supabase Auth | Google Classroom/Drive | OpenAI | RAG
```

```text
.
├── backend/    # Express API, database schema, Classroom sync, AI services
├── frontend/   # React application
└── docs/       # Project documentation and assets
```

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, Axios
- Backend: Node.js, Express.js, TypeScript, Zod
- Database: PostgreSQL with Drizzle ORM
- Authentication: Supabase Auth
- Integrations: Google Classroom API and Google Drive API
- AI: OpenAI, optional Hugging Face extraction provider
- File processing: `pdf-parse`

## Setup

Prerequisites: Node.js, npm, PostgreSQL, Supabase, Google Cloud Classroom API access, and an OpenAI API key.

```bash
cd backend
npm install
cp .env.example .env
npm run db:push
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The apps run at:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`

## Environment Variables

Backend values are defined in `backend/.env.example`:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google-classroom/callback
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Frontend values are defined in `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Useful Commands

```bash
# Backend
npm run dev
npm run build
npm run db:push
npm run db:generate
npm run db:migrate

# Frontend
npm run dev
npm run build
npm run lint
```

## Authentication

Protected API requests require a Supabase access token:

```http
Authorization: Bearer <supabase_access_token>
```

The backend verifies the token and scopes timetable, notes, courses, and Classroom data to the authenticated user.
