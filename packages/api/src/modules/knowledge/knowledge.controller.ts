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
import { KnowledgeService } from './knowledge.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateArticleDto,
  QueryArticlesDto,
  UpdateArticleDto,
} from './dto/article.dto.js';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  @Permissions('knowledge.read')
  list(@Query() query: QueryArticlesDto, @CurrentUser() actor: UserContext) {
    if (query.draft) {
      return this.knowledge.listDrafts(actor, query);
    }
    return this.knowledge.list(actor, query);
  }

  @Post()
  @Permissions('knowledge.create')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  create(@Body() dto: CreateArticleDto, @CurrentUser() actor: UserContext) {
    return this.knowledge.create(dto, actor);
  }

  @Get(':id')
  @Permissions('knowledge.read')
  findOne(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.knowledge.findOne(id, actor);
  }

  @Put(':id')
  @Permissions('knowledge.update')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.knowledge.update(id, dto, actor);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Permissions('knowledge.publish')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  publish(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.knowledge.publish(id, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('knowledge.update')
  @Roles('ADMIN', 'MANAGER', 'AGENT')
  remove(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.knowledge.remove(id, actor);
  }
}
