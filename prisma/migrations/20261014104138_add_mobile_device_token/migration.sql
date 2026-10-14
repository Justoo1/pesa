-- CreateTable
CREATE TABLE "MobileDeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileDeviceToken_fcmToken_key" ON "MobileDeviceToken"("fcmToken");

-- CreateIndex
CREATE INDEX "MobileDeviceToken_userId_idx" ON "MobileDeviceToken"("userId");

-- AddForeignKey
ALTER TABLE "MobileDeviceToken" ADD CONSTRAINT "MobileDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
