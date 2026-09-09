import { Module } from '@nestjs/common';
import { SolverGroupsController } from './solver-groups.controller.js';
import { SolverGroupsService } from './solver-groups.service.js';

@Module({
  controllers: [SolverGroupsController],
  providers: [SolverGroupsService],
})
export class SolverGroupsModule {}
