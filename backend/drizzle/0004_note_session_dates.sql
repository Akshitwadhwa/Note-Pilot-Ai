ALTER TABLE "note" ADD COLUMN "sessionDate" text;
--> statement-breakpoint
UPDATE "note"
SET "sessionDate" = DATE("timestamp")::text
WHERE "sessionDate" IS NULL;
--> statement-breakpoint
ALTER TABLE "note" ALTER COLUMN "sessionDate" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX "Note_timetableId_sessionDate_idx" ON "note" USING btree ("timetableId","sessionDate");
--> statement-breakpoint
CREATE INDEX "Note_userId_sessionDate_idx" ON "note" USING btree ("userId","sessionDate");
