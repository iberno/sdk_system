import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  parentId: true,
  path: true,
  depth: true,
  status: true,
  order: true,
} satisfies Prisma.CategorySelect;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ depth: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      select: CATEGORY_SELECT,
    });
  }

  async findOne(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      select: {
        ...CATEGORY_SELECT,
        children: { select: { id: true, name: true, path: true, depth: true } },
      },
    });
  }
}
