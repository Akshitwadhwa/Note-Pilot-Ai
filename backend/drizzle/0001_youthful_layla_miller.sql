CREATE TABLE "course" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"normalizedName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "Course_userId_idx" ON "course" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "Course_userId_normalizedName_key" ON "course" USING btree ("userId","normalizedName");