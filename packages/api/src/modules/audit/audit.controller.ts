import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import { AuditService } from './audit.service.js';
import { QueryAuditDto } from './dto/query-audit.dto.js';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@Roles('ADMIN', 'MANAGER')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: QueryAuditDto, @CurrentUser() actor: UserContext) {
    return this.audit.list(actor, query);
  }
}
