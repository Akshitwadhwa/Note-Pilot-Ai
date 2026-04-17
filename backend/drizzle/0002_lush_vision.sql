CREATE TABLE "course_document_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"courseId" text NOT NULL,
	"userId" text NOT NULL,
	"chunkIndex" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_document" (
	"id" text PRIMARY KEY NOT NULL,
	"courseId" text NOT NULL,
	"userId" text NOT NULL,
	"fileName" text NOT NULL,
	"mimeType" text NOT NULL,
	"byteSize" integer NOT NULL,
	"extractedText" text NOT NULL,
	"syllabusSummary" text,
	"credits" text,
	"evaluationCriteria" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "CourseDocumentChunk_courseId_idx" ON "course_document_chunk" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX "CourseDocumentChunk_documentId_idx" ON "course_document_chunk" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "CourseDocument_courseId_idx" ON "course_document" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX "CourseDocument_userId_idx" ON "course_document" USING btree ("userId");