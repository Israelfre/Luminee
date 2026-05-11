-- Make clerk_user_id nullable to support salons created by admin (email+password login only)
ALTER TABLE "salons" ALTER COLUMN "clerk_user_id" DROP NOT NULL;
