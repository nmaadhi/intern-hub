-- AlterTable
ALTER TABLE "SprintTask" ADD COLUMN     "codeLanguage" TEXT DEFAULT 'python',
ADD COLUMN     "isCodeTask" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CodeSubmission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "executionOutput" TEXT,
    "executionError" TEXT,
    "aiReview" TEXT,
    "aiVerdict" TEXT NOT NULL DEFAULT 'PENDING',
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "taskId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeSubmission_taskId_idx" ON "CodeSubmission"("taskId");

-- CreateIndex
CREATE INDEX "CodeSubmission_internId_idx" ON "CodeSubmission"("internId");

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SprintTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeSubmission" ADD CONSTRAINT "CodeSubmission_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
