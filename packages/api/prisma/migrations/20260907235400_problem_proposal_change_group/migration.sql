-- AlterTable
ALTER TABLE "Change" ADD COLUMN     "solverGroupId" TEXT;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "proposedChangeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Problem_proposedChangeId_key" ON "Problem"("proposedChangeId");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_proposedChangeId_fkey" FOREIGN KEY ("proposedChangeId") REFERENCES "Change"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_solverGroupId_fkey" FOREIGN KEY ("solverGroupId") REFERENCES "SolverGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
