import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoutingRulesService } from './routing-rules.service.js';
import {
  CreateRoutingRuleDto,
  ReorderRulesDto,
  UpdateRoutingRuleDto,
  UpdateRoutingRuleStatusDto,
} from './dto/routing-rule.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('RoutingRules')
@Controller('routing-rules')
@Permissions('admin.routing')
export class RoutingRulesController {
  constructor(private readonly routingRulesService: RoutingRulesService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Lista regras de roteamento' })
  findAll() {
    return this.routingRulesService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cria regra (valida estratégia + grupo alvo)' })
  create(@Body() dto: CreateRoutingRuleDto) {
    return this.routingRulesService.create(dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  @ApiOperation({ summary: 'Detalhes da regra' })
  findOne(@Param('id') id: string) {
    return this.routingRulesService.update(id, {});
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualiza regra' })
  update(@Param('id') id: string, @Body() dto: UpdateRoutingRuleDto) {
    return this.routingRulesService.update(id, dto);
  }

  @Post('reorder')
  @Roles('ADMIN')
  @ApiBody({ type: ReorderRulesDto })
  @ApiOperation({ summary: 'Define a ordem de avaliação das regras' })
  reorder(@Body() dto: ReorderRulesDto) {
    return this.routingRulesService.reorder(dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ativa/desativa regra' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoutingRuleStatusDto,
  ) {
    return this.routingRulesService.updateStatus(id, dto.status);
  }
}
