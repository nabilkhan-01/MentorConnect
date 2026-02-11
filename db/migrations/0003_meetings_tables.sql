CREATE TABLE IF NOT EXISTS "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"mentor_id" integer NOT NULL,
	"type" text DEFAULT 'one_to_one' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"mentee_id" integer NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"remarks" text,
	"stars" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
