-- AlterTable
ALTER TABLE "BankTransaction" ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bankBalance";
