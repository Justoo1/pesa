-- AlterTable
ALTER TABLE "Bucket" ADD COLUMN     "dueDayOfMonth" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roundUpStep" INTEGER NOT NULL DEFAULT 50;
