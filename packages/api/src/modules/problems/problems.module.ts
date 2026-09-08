import { Module } from '@nestjs/common';
import { ChangesModule } from '../changes/changes.module.js';
import { ProblemsController } from './problems.controller.js';
import { ProblemsService } from './problems.service.js';

@Module({
  imports: [ChangesModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
})
export class ProblemsModule {}