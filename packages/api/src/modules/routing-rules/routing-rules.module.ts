import { Module } from '@nestjs/common';
import { RoutingRulesController } from './routing-rules.controller.js';
import { RoutingRulesService } from './routing-rules.service.js';

@Module({
  controllers: [RoutingRulesController],
  providers: [RoutingRulesService],
  exports: [RoutingRulesService],
})
export class RoutingRulesModule {}