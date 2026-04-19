# Academic Timetable AI

Academic Timetable AI is an all-in-one student workspace for classes, course materials, notes, quizzes, and deadlines.

The app is built for a student workflow where course content does not live in one place. A student can manage their timetable, connect Google Classroom, sync teacher posts and materials, read AI-generated summaries, generate quizzes from study content, keep notes per class, and see only the updates that actually matter when they return to the dashboard.

## What This Project Is Building

This project is a student productivity platform that combines:

- timetable and class-session management
- course and handout organization
- Google Classroom sync
- AI summaries for synced study materials
- quiz generation and quiz attempt tracking
- material-based study packs and practice questions
- class notes and past-class note history
- dashboard alerts for new assignments, quizzes, and other Classroom updates


- prepare for quizzes from handouts and lecture materials
- keep notes linked to actual classes

Instead of forcing the student to manually download everything, re-upload it, and organize it again, the platform syncs course content from Google Classroom and turns it into a study workflow inside the app.

## Core User Flow

1. The student signs into the app.
2. The student connects Google Classroom.
3. The backend syncs courses, announcements, course work, course materials, and supported Drive attachments.
4. Synced materials appear inside the app with metadata such as subject, posted time, and attachments.
5. AI analysis can summarize the material and extract key points and topic tags.
6. The app can generate quizzes and study packs from the synced material and uploaded course handouts.
7. The dashboard shows schedule context plus new Google Classroom updates since the last visit.

## Current Features

- Weekly timetable management
- Timetable image import
- Current-class and next-class views
- Past-class notes tied to timetable entries
- Course workspace pages
- Course handout upload and document-based Q&A
- Google Classroom OAuth connection
- Google Classroom sync for:
  - announcements
  - coursework
  - course materials
  - supported Drive attachments
- Automatic PDF text extraction for supported Drive PDFs
- Automatic AI analysis for extracted Classroom materials during sync
- Material detail pages with:
  - attachment listing
  - AI analysis
  - material summary
  - generated quiz
  - quiz attempts
- Quiz Prep area in the sidebar for generated quizzes and results
- Dashboard filtering for new Classroom updates since the student last viewed the dashboard

## Monorepo Structure

```text
.
├── backend/    # Express + TypeScript API, Drizzle schema, Google Classroom sync, AI services
├── frontend/   # React + TypeScript + Vite client
└── docs/       # Project notes and internal docs
```

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Axios
- Backend: Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, Zod
- Auth: Supabase
- Classroom integration: Google Classroom API + Google Drive API
- AI: OpenAI
- PDF parsing: `pdf-parse`

## Prerequisites

- Node.js
- npm
- PostgreSQL database
- Supabase project
- Google Cloud project with Google Classroom API enabled
- OpenAI API key for AI features

## Environment Variables

### Backend

Create `backend/.env` and set:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_BASE_URL=http://localhost:5173/materials

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google-classroom/callback

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

RAG_EXTRACTION_PROVIDER=openai
HUGGINGFACE_API_KEY=
HUGGINGFACE_EXTRACTION_MODEL=
```

### Frontend

Create `frontend/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Local Development

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Run database sync

For local development, the fastest path is:

```bash
cd backend
npm run db:push
```

Available backend database scripts:

- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:studio`

### 3. Start the backend

```bash
cd backend
npm run dev
```

Backend default URL:

- `http://localhost:4000`
- API base: `http://localhost:4000/api`

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend default URL:

- `http://localhost:5173`

## Google Classroom Setup

To use Classroom sync:

1. Create a Google Cloud project.
2. Enable the Google Classroom API.
3. Configure the OAuth consent screen.
4. Create an OAuth client for a web application.
5. Add this backend callback as an authorized redirect URI:

```text
http://localhost:4000/api/google-classroom/callback
```

6. Add your testing Google account as a test user if the app is still in testing mode.

## Product Areas

### Dashboard

The dashboard is the student command center. It currently includes:

- current session
- next class
- class notes
- focused schedule view for today or the next scheduled day
- new Google Classroom updates since the last dashboard visit

### Materials

The materials area turns synced Classroom content into study content. Each material can show:

- metadata
- attachments
- AI analysis
- material summary
- generated quiz
- quiz attempts

### Courses

The courses area acts like a subject workspace. It supports:

- subject list
- course handouts
- handout-based Ask AI
- notes and synced Classroom materials inside each course

### Notes

Notes are linked to actual timetable entries so a student can:

- take notes during class
- open previous class sessions
- see saved notes for that class
- add notes for past classes

### Quiz Prep

Quiz Prep is a consolidated area where the student can:

- see generated quizzes
- review scores
- inspect attempt history
- jump back to the source material

## AI Capabilities

The current AI layer supports:

- note summarization
- course handout Q&A
- synced material analysis
- material summaries and study packs
- quiz generation from materials
- quiz-related dashboard insights

The system is designed around source-backed answers whenever possible, especially in course-level Q&A and study-pack generation.

## Notes About PDF Handling

- Supported Google Drive PDFs are parsed during Classroom sync.
- If text extraction succeeds, the material can be automatically analyzed during sync.
- Text-based PDFs work better than scanned image PDFs.
- If Drive access is missing or the PDF has no extractable text, the summary may not be available.

## Current Direction

This project is moving toward a full student operating system rather than a simple timetable app. The main direction is:

- make Google Classroom updates actionable
- turn uploaded and synced materials into study aids
- connect class sessions, notes, deadlines, and quizzes in one workflow

## Scripts

### Backend

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:studio`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## License

No license file is currently included in this repository.
