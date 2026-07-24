DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salons' AND column_name = 'password_plain'
  ) THEN
    UPDATE "salons" SET "password_plain" = NULL WHERE "password_plain" IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "salons" DROP COLUMN IF EXISTS "password_plain";
