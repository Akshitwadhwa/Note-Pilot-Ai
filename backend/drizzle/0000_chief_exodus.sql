CREATE TYPE "public"."DayOfWeek" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');--> statement-breakpoint
CREATE TABLE "note" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"timetableId" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dayOfWeek" "DayOfWeek" NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"subjectName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "Note_timetableId_timestamp_idx" ON "note" USING btree ("timetableId","timestamp");--> statement-breakpoint
CREATE INDEX "Note_userId_timestamp_idx" ON "note" USING btree ("userId","timestamp");--> statement-breakpoint
CREATE INDEX "Timetable_userId_dayOfWeek_startTime_endTime_idx" ON "timetable" USING btree ("userId","dayOfWeek","startTime","endTime");