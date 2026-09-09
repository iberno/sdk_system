import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service.js';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  UpdateCompanyStatusDto,
} from './dto/company.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

@ApiTags('Companies')
@Controller('companies')
@Roles('ADMIN')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista empresas' })
  findAll(@Query() query: PaginationDto) {
    return this.companiesService.findAll(query);
  }

  @Get('options')
  @Roles('ADMIN', 'MANAGER', 'AGENT', 'USER')
  @ApiOperation({
    summary:
      'Opções de empresas para o usuário logado (team: todas ATIVAS; USER: a própria)',
  })
  options(@CurrentUser() actor: UserContext) {
    return this.companiesService.options(actor);
  }

  @Post()
  @ApiOperation({ summary: 'Cria empresa (valida CNPJ)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da empresa' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza empresa' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativa empresa (soft delete)' })
  softDelete(@Param('id') id: string) {
    return this.companiesService.softDelete(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Altera status da empresa' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCompanyStatusDto) {
    return this.companiesService.updateStatus(id, dto.status);
  }
}
