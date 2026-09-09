import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { RoutingRulesModule } from '../routing-rules/routing-rules.module.js';
import { SlaModule } from '../sla/sla.module.js';
import { ApprovalsModule } from '../approvals/approvals.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [
    RoutingRulesModule,
    SlaModule,
    ApprovalsModule,
    AuditModule,
    RealtimeModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
