-- DropIndex
DROP INDEX "Ticket_ticketNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_companyId_key" ON "Ticket"("ticketNumber", "companyId");
