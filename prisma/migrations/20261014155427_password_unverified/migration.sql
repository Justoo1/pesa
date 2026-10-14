-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordUnverified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing password accounts whose email was never verified are
-- treated as unproven until their owner signs in through the inbox.
UPDATE "User" SET "passwordUnverified" = true
WHERE "passwordHash" IS NOT NULL AND "emailVerified" IS NULL;
