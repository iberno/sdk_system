import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChangesService } from './changes.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateChangeDto,
  LinkChangeTicketDto,
  QueryChangesDto,
  UpdateChangeDto,
} from './dto/change.dto.js';

@ApiTags('changes')
@ApiBearerAuth()
@Controller('changes')
@Permissions('changes.read')
@Roles('ADMIN', 'MANAGER', 'AGENT')
export class ChangesController {
  constructor(private readonly changesService: ChangesService) {}

  @Get()
  findAll(@Query() query: QueryChangesDto, @CurrentUser() actor: UserContext) {
    return this.changesService.findAll(query, actor);
  }

  @Post()
  @Permissions('changes.create')
  create(@Body() dto: CreateChangeDto, @CurrentUser() actor: UserContext) {
    return this.changesService.create(dto, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.changesService.findOne(id, actor);
  }

  @Put(':id')
  @Permissions('changes.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChangeDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.changesService.update(id, dto, actor);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Permissions('changes.create')
  submit(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.changesService.submit(id, actor);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @Permissions('changes.execute')
  execute(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.changesService.execute(id, actor);
  }

  @Post(':id/rollback')
  @HttpCode(HttpStatus.OK)
  @Permissions('changes.rollback')
  rollback(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.changesService.rollback(id, actor);
  }

  @Post(':id/link-ticket')
  @HttpCode(HttpStatus.OK)
  @Permissions('changes.update')
  linkTicket(
    @Param('id') id: string,
    @Body() dto: LinkChangeTicketDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.changesService.linkTicket(id, dto, actor);
  }
}
