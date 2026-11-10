-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('AD', 'ARTICLE', 'FREEHAND');

-- AlterTable
ALTER TABLE "Newsletter" DROP COLUMN "body";

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAd" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "platsbankenId" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "publishedAt" TEXT NOT NULL,
    "applicationDeadline" TEXT NOT NULL,

    CONSTRAINT "JobAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entry_newsletterId_position_idx" ON "Entry"("newsletterId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "JobAd_entryId_key" ON "JobAd"("entryId");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAd" ADD CONSTRAINT "JobAd_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

