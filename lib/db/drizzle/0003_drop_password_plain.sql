UPDATE "salons" SET "password_plain" = NULL WHERE "password_plain" IS NOT NULL;
ALTER TABLE "salons" DROP COLUMN IF EXISTS "password_plain";
