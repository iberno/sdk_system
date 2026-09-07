import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Lista usuários com filtros e paginação' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cria usuário' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: UserContext) {
    return this.usersService.create(dto, actor);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Detalhes do usuário com permissões efetivas' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiBody({ type: UpdateUserDto })
  @ApiOperation({ summary: 'Atualiza usuário (role/solverGroup s/ permissão MANAGER)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: UserContext) {
    return this.usersService.update(id, dto, actor);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Altera status do usuário (soft disable)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.usersService.updateStatus(id, dto.status, actor);
  }
}