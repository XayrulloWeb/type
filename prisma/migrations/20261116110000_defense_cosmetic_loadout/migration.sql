-- CreateTable
CREATE TABLE "GameLoadout" (
    "userId" TEXT NOT NULL,
    "arena" TEXT NOT NULL DEFAULT 'nova',
    "laser" TEXT NOT NULL DEFAULT 'cyan',
    "core" TEXT NOT NULL DEFAULT 'nova',
    "burst" TEXT NOT NULL DEFAULT 'spark',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameLoadout_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "GameLoadout" ADD CONSTRAINT "GameLoadout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
