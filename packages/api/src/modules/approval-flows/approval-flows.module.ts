import { Module } from '@nestjs/common';
import { ApprovalFlowsController } from './approval-flows.controller.js';
import { ApprovalFlowsService } from './approval-flows.service.js';

@Module({
  imports: [],
  controllers: [ApprovalFlowsController],
  providers: [ApprovalFlowsService],
  exports: [ApprovalFlowsService],
})
export class ApprovalFlowsModule {}