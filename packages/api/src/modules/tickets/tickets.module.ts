import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { RoutingRulesModule } from '../routing-rules/routing-rules.module.js';
import { SlaModule } from '../sla/sla.module.js';

@Module({
  imports: [RoutingRulesModule, SlaModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}