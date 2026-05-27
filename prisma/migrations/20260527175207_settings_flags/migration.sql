-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appLockEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "appLockPinHash" TEXT,
ADD COLUMN     "paydayDayOfMonth" INTEGER,
ADD COLUMN     "paydayRemindersOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roundUpsEnabled" BOOLEAN NOT NULL DEFAULT false;
