-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "cohortId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AssignmentRecipient" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentRecipient_assignmentId_idx" ON "AssignmentRecipient"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentRecipient_internId_idx" ON "AssignmentRecipient"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRecipient_assignmentId_internId_key" ON "AssignmentRecipient"("assignmentId", "internId");

-- AddForeignKey
ALTER TABLE "AssignmentRecipient" ADD CONSTRAINT "AssignmentRecipient_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRecipient" ADD CONSTRAINT "AssignmentRecipient_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
