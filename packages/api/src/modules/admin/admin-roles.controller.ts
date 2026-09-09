import { Body, Controller, Get, Put, Param } from '@nestjs/common';
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
    const rolePerms = await this.prisma.rolePermission.groupBy({
      by: ['roleId'],
      _count: { permissionId: true },
    });

    const allRolePerms = await this.prisma.rolePermission.findMany({
      include: { permission: { select: { code: true } } },
    });

    const roleMap = new Map<string, string[]>();
    for (const rp of allRolePerms) {
      if (!roleMap.has(rp.roleId)) roleMap.set(rp.roleId, []);
      roleMap.get(rp.roleId)!.push(rp.permission.code);
    }

    const roles = ['ADMIN', 'MANAGER', 'AGENT', 'USER'].map((role) => ({
      role,
      label: role,
      permissions: roleMap.get(role) ?? [],
    }));

    return { data: roles };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Lista todas as permissões disponíveis' })
  async findPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return { data: permissions };
  }

  @Put(':role/permissions')
  @ApiOperation({ summary: 'Atualiza permissões de uma role' })
  async updatePermissions(
    @Param('role') role: string,
    @Body() body: { permissions: string[] },
  ) {
    const validRoles = ['ADMIN', 'MANAGER', 'AGENT', 'USER'];
    if (!validRoles.includes(role)) {
      return { error: 'Invalid role' };
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: role } });

    if (body.permissions.length > 0) {
      const perms = await this.prisma.permission.findMany({
        where: { code: { in: body.permissions } },
      });

      await this.prisma.rolePermission.createMany({
        data: perms.map((p) => ({
          roleId: role,
          permissionId: p.id,
        })),
      });
    }

    return { success: true };
  }
}
