CREATE TABLE "google_classroom_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"googleUserId" text,
	"googleEmail" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"scope" text,
	"tokenExpiryAt" timestamp,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_classroom_material" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"externalId" text NOT NULL,
	"sourceType" text NOT NULL,
	"courseGoogleId" text,
	"courseName" text,
	"title" text NOT NULL,
	"description" text,
	"alternateLink" text,
	"topicId" text,
	"state" text,
	"extractedText" text,
	"metadata" jsonb,
	"publishedAt" timestamp,
	"sourceUpdatedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_classroom_material_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"materialId" text NOT NULL,
	"userId" text NOT NULL,
	"attachmentType" text NOT NULL,
	"title" text,
	"url" text,
	"driveFileId" text,
	"mimeType" text,
	"thumbnailUrl" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_ai_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"materialId" text NOT NULL,
	"userId" text NOT NULL,
	"summary" text NOT NULL,
	"keyPoints" jsonb NOT NULL,
	"topicTags" jsonb NOT NULL,
	"sourceText" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"materialId" text NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"totalQuestions" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_quiz_question" (
	"id" text PRIMARY KEY NOT NULL,
	"quizId" text NOT NULL,
	"materialId" text NOT NULL,
	"userId" text NOT NULL,
	"position" integer NOT NULL,
	"type" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb,
	"answer" text NOT NULL,
	"explanation" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_quiz_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"quizId" text NOT NULL,
	"materialId" text NOT NULL,
	"userId" text NOT NULL,
	"score" integer NOT NULL,
	"totalQuestions" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "GoogleClassroomConnection_userId_key" ON "google_classroom_connection" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "GoogleClassroomMaterial_userId_idx" ON "google_classroom_material" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "GoogleClassroomMaterial_userId_publishedAt_idx" ON "google_classroom_material" USING btree ("userId","publishedAt");--> statement-breakpoint
CREATE INDEX "GoogleClassroomMaterial_userId_courseGoogleId_idx" ON "google_classroom_material" USING btree ("userId","courseGoogleId");--> statement-breakpoint
CREATE UNIQUE INDEX "GoogleClassroomMaterial_userId_externalId_key" ON "google_classroom_material" USING btree ("userId","externalId");--> statement-breakpoint
CREATE INDEX "GoogleClassroomMaterialAttachment_materialId_idx" ON "google_classroom_material_attachment" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "GoogleClassroomMaterialAttachment_userId_idx" ON "google_classroom_material_attachment" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "MaterialAiAnalysis_materialId_key" ON "material_ai_analysis" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "MaterialAiAnalysis_userId_idx" ON "material_ai_analysis" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "MaterialQuiz_materialId_idx" ON "material_quiz" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "MaterialQuiz_userId_idx" ON "material_quiz" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "MaterialQuizQuestion_quizId_idx" ON "material_quiz_question" USING btree ("quizId");--> statement-breakpoint
CREATE INDEX "MaterialQuizQuestion_materialId_idx" ON "material_quiz_question" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "MaterialQuizAttempt_quizId_idx" ON "material_quiz_attempt" USING btree ("quizId");--> statement-breakpoint
CREATE INDEX "MaterialQuizAttempt_materialId_idx" ON "material_quiz_attempt" USING btree ("materialId");--> statement-breakpoint
CREATE INDEX "MaterialQuizAttempt_userId_idx" ON "material_quiz_attempt" USING btree ("userId");
