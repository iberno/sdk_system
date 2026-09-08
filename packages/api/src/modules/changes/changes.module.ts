import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ChangesController } from './changes.controller.js';
import { ChangesService } from './changes.service.js';

@Module({
  imports: [ApprovalsModule, AuditModule],
  controllers: [ChangesController],
  providers: [ChangesService],
  exports: [ChangesService],
})
export class ChangesModule {}