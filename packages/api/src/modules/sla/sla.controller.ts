import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlaService } from './sla.service.js';
import {
  CreateSlapolicyDto,
  UpdateSlapolicyDto,
  UpdateSlapolicyStatusDto,
} from './dto/sla-policy.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('SLA')
@Controller('sla-policies')
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Lista políticas de SLA' })
  findAll() {
    return this.slaService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cria política de SLA (matriz tipo+prioridade)' })
  create(@Body() dto: CreateSlapolicyDto) {
    return this.slaService.create(dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Detalhes da política' })
  findOne(@Param('id') id: string) {
    return this.slaService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualiza política' })
  update(@Param('id') id: string, @Body() dto: UpdateSlapolicyDto) {
    return this.slaService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ativa/desativa política' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSlapolicyStatusDto) {
    return this.slaService.updateStatus(id, dto.status);
  }
}