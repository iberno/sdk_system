-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "routedByAuto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routedRuleId" TEXT,
ADD COLUMN     "routedStrategy" "RoutingStrategy";
