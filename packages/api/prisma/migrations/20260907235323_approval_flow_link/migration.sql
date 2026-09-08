-- AlterTable
ALTER TABLE "Approval" ADD COLUMN     "flowId" TEXT,
ADD COLUMN     "prevStatus" TEXT;

-- CreateIndex
CREATE INDEX "Approval_flowId_idx" ON "Approval"("flowId");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "ApprovalFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
