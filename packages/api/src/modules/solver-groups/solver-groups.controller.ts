import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SolverGroupsService } from './solver-groups.service.js';
import {
  CreateSolverGroupDto,
  ReplaceAgentsDto,
  UpdateSolverGroupDto,
  UpdateSolverGroupStatusDto,
} from './dto/solver-group.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('SolverGroups')
@Controller('solver-groups')
export class SolverGroupsController {
  constructor(private readonly solverGroupsService: SolverGroupsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Lista grupos com contagem de agentes e tickets' })
  findAll() {
    return this.solverGroupsService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cria grupo (mín. 1 agente)' })
  create(@Body() dto: CreateSolverGroupDto) {
    return this.solverGroupsService.create(dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Detalhes do grupo com agentes' })
  findOne(@Param('id') id: string) {
    return this.solverGroupsService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualiza dados do grupo' })
  update(@Param('id') id: string, @Body() dto: UpdateSolverGroupDto) {
    return this.solverGroupsService.update(id, dto);
  }

  @Put(':id/agents')
  @Roles('ADMIN')
  @ApiBody({ type: ReplaceAgentsDto })
  @ApiOperation({ summary: 'Substitui a lista de agentes do grupo (mín. 1)' })
  replaceAgents(@Param('id') id: string, @Body() dto: ReplaceAgentsDto) {
    return this.solverGroupsService.replaceAgents(id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ativa/desativa grupo (ativação exige ≥1 agente)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSolverGroupStatusDto,
  ) {
    return this.solverGroupsService.updateStatus(id, dto.status);
  }
}
