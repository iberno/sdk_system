import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProblemsService } from './problems.service.js';
import { ChangesService } from '../changes/changes.service.js';
import { KnowledgeService } from '../knowledge/knowledge.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateProblemDto,
  LinkTicketDto,
  QueryProblemsDto,
  UpdateProblemDto,
} from './dto/problem.dto.js';

@ApiTags('problems')
@ApiBearerAuth()
@Controller('problems')
@Permissions('problems.read')
@Roles('ADMIN', 'MANAGER', 'AGENT')
export class ProblemsController {
  constructor(
    private readonly problemsService: ProblemsService,
    private readonly changesService: ChangesService,
    private readonly knowledge: KnowledgeService,
  ) {}

  @Get()
  findAll(@Query() query: QueryProblemsDto, @CurrentUser() actor: UserContext) {
    return this.problemsService.findAll(query, actor);
  }

  @Post()
  @Permissions('problems.create')
  create(@Body() dto: CreateProblemDto, @CurrentUser() actor: UserContext) {
    return this.problemsService.create(dto, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.problemsService.findOne(id, actor);
  }

  @Put(':id')
  @Permissions('problems.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProblemDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.problemsService.update(id, dto, actor);
  }

  @Post(':id/link-ticket')
  @HttpCode(HttpStatus.OK)
  @Permissions('problems.link')
  linkTicket(
    @Param('id') id: string,
    @Body() dto: LinkTicketDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.problemsService.linkTicket(id, dto, actor);
  }

  @Delete(':id/unlink-ticket')
  @HttpCode(HttpStatus.OK)
  @Permissions('problems.link')
  unlinkTicket(
    @Param('id') id: string,
    @Body() dto: LinkTicketDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.problemsService.unlinkTicket(id, dto.ticketId, actor);
  }

  @Post(':id/propose-change')
  @HttpCode(HttpStatus.OK)
  @Permissions('problems.create')
  proposeChange(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.changesService.proposeFromProblem(id, actor);
  }

  @Post(':id/publish-article')
  @HttpCode(HttpStatus.OK)
  @Permissions('knowledge.publish')
  publishArticle(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.knowledge.publishFromProblem(id, actor);
  }
}
