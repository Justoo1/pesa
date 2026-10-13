-- CreateTable
CREATE TABLE "MobileLoginCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileLoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileLoginCode_email_idx" ON "MobileLoginCode"("email");
