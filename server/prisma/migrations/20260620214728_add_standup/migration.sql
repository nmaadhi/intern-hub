-- CreateTable
CREATE TABLE "Standup" (
    "id" TEXT NOT NULL,
    "yesterday" TEXT NOT NULL,
    "today" TEXT NOT NULL,
    "blockers" TEXT,
    "internId" TEXT NOT NULL,
    "sprintId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Standup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Standup_internId_idx" ON "Standup"("internId");

-- CreateIndex
CREATE INDEX "Standup_sprintId_idx" ON "Standup"("sprintId");

-- AddForeignKey
ALTER TABLE "Standup" ADD CONSTRAINT "Standup_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standup" ADD CONSTRAINT "Standup_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
