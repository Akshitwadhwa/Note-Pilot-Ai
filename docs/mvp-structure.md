# MVP Structure

## Product scope

The locked MVP for this repo is:

- Student connects Google Classroom
- Backend syncs courses and classroom materials
- Student sees synced materials with title, course, upload time, source type, and attachments
- Student can generate AI analysis for a material
- Student can generate and attempt a quiz from a material

## Current repo mapping

### Backend

- `backend/src/routes/google-classroom.routes.ts`
  Handles Classroom auth, sync, material listing/detail, analysis, quizzes, and quiz attempts.
- `backend/src/controllers/google-classroom.controller.ts`
  Thin HTTP layer for the Classroom MVP.
- `backend/src/services/google-classroom.service.ts`
  Owns Google API sync, normalized material persistence, AI analysis, and quiz generation.
- `backend/src/lib/drizzle/schema.ts`
  Owns the MVP tables:
  - `google_classroom_connection`
  - `google_classroom_material`
  - `google_classroom_material_attachment`
  - `material_ai_analysis`
  - `material_quiz`
  - `material_quiz_question`
  - `material_quiz_attempt`

### Frontend

- `frontend/src/features/google-classroom/api.ts`
  API client for the Classroom MVP.
- `frontend/src/types/domain.ts`
  Shared app types for materials, analysis, quizzes, and attempts.

## Explicit non-goals for this MVP

- Full Drive file ingestion and parsing
- Teacher roster sync
- Deadline planner
- Flashcards
- Multi-material chat

## Known limitation

Current sync stores normalized Classroom metadata and attachment references. AI analysis and quizzes are generated from the synced metadata plus any extracted text available later. If Drive file content ingestion is added, it should extend `google_classroom_material.extractedText` rather than create a parallel document model.
