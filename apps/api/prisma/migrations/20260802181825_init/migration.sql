-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "whitePlayer" TEXT NOT NULL,
    "blackPlayer" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");
