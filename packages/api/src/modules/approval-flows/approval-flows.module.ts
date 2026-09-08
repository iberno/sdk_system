import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ApprovalFlowsController } from './approval-flows.controller.js';
import { ApprovalFlowsService } from './approval-flows.service.js';

@Module({
  imports: [AuditModule],
  controllers: [ApprovalFlowsController],
  providers: [ApprovalFlowsService],
  exports: [ApprovalFlowsService],
})
export class ApprovalFlowsModule {}