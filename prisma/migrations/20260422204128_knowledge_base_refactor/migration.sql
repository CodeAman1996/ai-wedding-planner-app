/*
  Warnings:

  - You are about to drop the `RecommendationRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SuggestedPlace` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "KnowledgeKind" AS ENUM ('PROFILE', 'PREFERENCE', 'RECOMMENDATION', 'PLACE', 'NOTE');

-- DropForeignKey
ALTER TABLE "RecommendationRun" DROP CONSTRAINT "RecommendationRun_userId_fkey";

-- DropForeignKey
ALTER TABLE "SuggestedPlace" DROP CONSTRAINT "SuggestedPlace_runId_fkey";

-- DropTable
DROP TABLE "RecommendationRun";

-- DropTable
DROP TABLE "SuggestedPlace";

-- DropEnum
DROP TYPE "RecommendationStatus";

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "KnowledgeKind" NOT NULL,
    "referenceKey" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "metadata" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDocument_referenceKey_key" ON "KnowledgeDocument"("referenceKey");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_chunkIndex_key" ON "KnowledgeChunk"("documentId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
