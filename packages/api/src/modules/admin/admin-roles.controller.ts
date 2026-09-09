import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('Admin Roles')
@Controller('admin/roles')
@Permissions('admin.roles')
export class AdminRolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista roles com suas permissões' })
  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: { select: { code: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      role: r.id,
      label: r.label,
      isSystem: r.isSystem,
      permissions: r.permissions.map((rp) => rp.permission.code),
    }));
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Lista todas as permissões disponíveis' })
  async findPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma nova role' })
  async create(@Body() body: { name: string; label: string }) {
    if (!body.name || !body.label) {
      throw new BadRequestException('name and label are required');
    }

    const existing = await this.prisma.role.findUnique({
      where: { name: body.name.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException('Role already exists');
    }

    return this.prisma.role.create({
      data: {
        id: body.name.toUpperCase(),
        name: body.name.toUpperCase(),
        label: body.label,
        isSystem: false,
      },
    });
  }

  @Put(':role')
  @ApiOperation({ summary: 'Atualiza label de uma role' })
  async update(@Param('role') role: string, @Body() body: { label: string }) {
    const r = await this.prisma.role.findUnique({
      where: { id: role.toUpperCase() },
    });
    if (!r) throw new NotFoundException('Role not found');

    return this.prisma.role.update({
      where: { id: role.toUpperCase() },
      data: { label: body.label },
    });
  }

  @Delete(':role')
  @ApiOperation({ summary: 'Deleta uma role customizada' })
  async remove(@Param('role') role: string) {
    const r = await this.prisma.role.findUnique({
      where: { id: role.toUpperCase() },
    });
    if (!r) throw new NotFoundException('Role not found');
    if (r.isSystem) throw new BadRequestException('Cannot delete system role');

    await this.prisma.rolePermission.deleteMany({ where: { roleId: r.id } });
    return this.prisma.role.delete({ where: { id: r.id } });
  }

  @Put(':role/permissions')
  @ApiOperation({ summary: 'Atualiza permissões de uma role' })
  async updatePermissions(
    @Param('role') role: string,
    @Body() body: { permissions: string[] },
  ) {
    const r = await this.prisma.role.findUnique({
      where: { id: role.toUpperCase() },
    });
    if (!r) throw new NotFoundException('Role not found');

    await this.prisma.rolePermission.deleteMany({ where: { roleId: r.id } });

    if (body.permissions.length > 0) {
      const perms = await this.prisma.permission.findMany({
        where: { code: { in: body.permissions } },
      });

      await this.prisma.rolePermission.createMany({
        data: perms.map((p) => ({
          roleId: r.id,
          permissionId: p.id,
        })),
      });
    }

    return { success: true };
  }
}
