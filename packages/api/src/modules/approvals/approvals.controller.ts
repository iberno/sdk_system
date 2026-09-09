import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service.js';
import {
  ApproveDto,
  QueryApprovalsDto,
  RejectDto,
} from './dto/approval.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @Permissions('approvals.read')
  @ApiOperation({ summary: 'Minhas aprovações (item/por fluxo)' })
  list(@CurrentUser() actor: UserContext, @Query() query: QueryApprovalsDto) {
    return this.approvals.list(actor, query);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions('approvals.decide')
  @ApiOperation({ summary: 'Aprova a etapa' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.approvals.approve(id, dto, actor);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Permissions('approvals.decide')
  @ApiOperation({ summary: 'Rejeita a etapa e encerra o fluxo' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.approvals.reject(id, dto, actor);
  }
}
