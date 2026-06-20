/*
  Warnings:

  - You are about to drop the column `status` on the `Sprint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Sprint" DROP COLUMN "status",
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'PLANNING',
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "velocity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SprintTask" ADD COLUMN     "storyPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SprintDailySnapshot" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "remainingPoints" INTEGER NOT NULL,
    "completedPoints" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SprintDailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SprintDailySnapshot_sprintId_idx" ON "SprintDailySnapshot"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintDailySnapshot_sprintId_date_key" ON "SprintDailySnapshot"("sprintId", "date");

-- CreateIndex
CREATE INDEX "Sprint_phase_idx" ON "Sprint"("phase");

-- AddForeignKey
ALTER TABLE "SprintDailySnapshot" ADD CONSTRAINT "SprintDailySnapshot_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
