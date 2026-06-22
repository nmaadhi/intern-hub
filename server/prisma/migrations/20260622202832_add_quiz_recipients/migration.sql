-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "assignType" TEXT NOT NULL DEFAULT 'COHORT',
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "QuizRecipient" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizRecipient_quizId_idx" ON "QuizRecipient"("quizId");

-- CreateIndex
CREATE INDEX "QuizRecipient_internId_idx" ON "QuizRecipient"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizRecipient_quizId_internId_key" ON "QuizRecipient"("quizId", "internId");

-- AddForeignKey
ALTER TABLE "QuizRecipient" ADD CONSTRAINT "QuizRecipient_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizRecipient" ADD CONSTRAINT "QuizRecipient_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
