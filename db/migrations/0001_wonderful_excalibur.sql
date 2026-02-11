DO $$ BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'messages'
			AND column_name = 'receiver_id'
			AND is_nullable = 'NO'
	) THEN
		ALTER TABLE "messages" ALTER COLUMN "receiver_id" DROP NOT NULL;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mentor_id" integer;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_group_message" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "target_user_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
