import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApprovalFlowsService } from './approval-flows.service.js';
import {
  CreateApprovalFlowDto,
  QueryApprovalFlowsDto,
  UpdateApprovalFlowDto,
  UpdateFlowStatusDto,
} from './dto/approval-flow.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

@ApiTags('ApprovalFlows')
@Controller('approval-flows')
@Permissions('admin.flows')
export class ApprovalFlowsController {
  constructor(private readonly flows: ApprovalFlowsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Lista fluxos de aprovação' })
  findAll(
    @Query() query: QueryApprovalFlowsDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.flows.findAll(query, actor);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cria fluxo (valida rules.stages)' })
  create(
    @Body() dto: CreateApprovalFlowDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.flows.create(dto, actor);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Detalhes do fluxo' })
  findOne(@Param('id') id: string) {
    return this.flows.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Atualiza fluxo' })
  update(@Param('id') id: string, @Body() dto: UpdateApprovalFlowDto) {
    return this.flows.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Ativa/desativa fluxo' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFlowStatusDto) {
    return this.flows.updateStatus(id, dto.status);
  }
}
