import { Module } from '@nestjs/common';
import { ChangesModule } from '../changes/changes.module.js';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ProblemsController } from './problems.controller.js';
import { ProblemsService } from './problems.service.js';

@Module({
  imports: [ChangesModule, KnowledgeModule, AuditModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
})
export class ProblemsModule {}