import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginationArgs, paginationMeta } from '../../common/dto/pagination.dto.js';
import { AuditService } from '../audit/audit.service.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateArticleDto,
  QueryArticlesDto,
  UpdateArticleDto,
} from './dto/article.dto.js';

const ARTICLE_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
} satisfies Prisma.KnowledgeArticleInclude;

function assertTeam(actor: UserContext) {
  if (actor.role === 'USER') {
    throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
  }
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: UserContext, query: QueryArticlesDto) {
    const where: Prisma.KnowledgeArticleWhereInput = { published: true };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        ...paginationArgs(query.page, query.pageSize),
        where,
        orderBy: { updatedAt: 'desc' },
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);

    return {
      items: rows.map((a) => this.mapArticle(a)),
      pagination: paginationMeta(query.page, query.pageSize, totalItems),
    };
  }

  async listDrafts(actor: UserContext, query: QueryArticlesDto) {
    assertTeam(actor);
    const where: Prisma.KnowledgeArticleWhereInput = { published: false };
    if (actor.role !== 'ADMIN' && actor.role !== 'MANAGER') {
      where.authorId = actor.sub;
    }
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({
        ...paginationArgs(query.page, query.pageSize),
        where,
        orderBy: { updatedAt: 'desc' },
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);

    return {
      items: rows.map((a) => this.mapArticle(a)),
      pagination: paginationMeta(query.page, query.pageSize, totalItems),
    };
  }

  async findOne(id: string, actor: UserContext) {
    const article = await this.getArticle(id);
    if (!this.canRead(article, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return this.mapArticle(article);
  }

  async create(dto: CreateArticleDto, actor: UserContext) {
    assertTeam(actor);
    const article = await this.prisma.knowledgeArticle.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category ?? 'GENERAL',
        tags: dto.tags ?? [],
        authorId: actor.sub,
        published: false,
      },
      include: ARTICLE_INCLUDE,
    });
    await this.audit.log({
      action: 'CREATE',
      entity: 'KnowledgeArticle',
      entityId: article.id,
      userId: actor.sub,
      newData: { title: article.title, category: article.category },
    });
    return this.mapArticle(article);
  }

  async update(id: string, dto: UpdateArticleDto, actor: UserContext) {
    const prev = await this.getArticle(id);
    this.assertOwner(prev, actor);
    const updated = await this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      },
      include: ARTICLE_INCLUDE,
    });
    await this.audit.log({
      action: 'UPDATE',
      entity: 'KnowledgeArticle',
      entityId: id,
      userId: actor.sub,
      oldData: { title: prev.title },
      newData: { title: updated.title, category: updated.category },
    });
    return this.mapArticle(updated);
  }

  async publish(id: string, actor: UserContext) {
    const article = await this.getArticle(id);
    this.assertOwner(article, actor);
    const updated = await this.prisma.knowledgeArticle.update({
      where: { id },
      data: { published: true },
      include: ARTICLE_INCLUDE,
    });
    await this.audit.log({
      action: 'PUBLISH',
      entity: 'KnowledgeArticle',
      entityId: id,
      userId: actor.sub,
      oldData: { published: article.published },
      newData: { published: true },
    });
    return this.mapArticle(updated);
  }

  async remove(id: string, actor: UserContext) {
    const article = await this.getArticle(id);
    this.assertOwner(article, actor);
    await this.prisma.knowledgeArticle.delete({ where: { id } });
    await this.audit.log({
      action: 'DELETE',
      entity: 'KnowledgeArticle',
      entityId: id,
      userId: actor.sub,
      newData: { title: article.title },
    });
    return { id, deleted: true };
  }

  async publishFromProblem(problemId: string, actor: UserContext) {
    assertTeam(actor);
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        description: true,
        solution: true,
        status: true,
      },
    });
    if (!problem) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    if (problem.status !== 'RESOLVED' && problem.status !== 'CLOSED') {
      throw new UnprocessableEntityException({
        key: 'business.knowledge_problem_resolved',
        error: 'UnprocessableEntity',
      });
    }

    const article = await this.prisma.knowledgeArticle.create({
      data: {
        title: `Solução: ${problem.title}`,
        content: problem.solution ?? problem.description,
        category: 'SOLUTION',
        tags: ['problema', 'solução'],
        authorId: actor.sub,
        published: true,
      },
      include: ARTICLE_INCLUDE,
    });
    await this.audit.log({
      action: 'PUBLISH',
      entity: 'KnowledgeArticle',
      entityId: article.id,
      userId: actor.sub,
      newData: { title: article.title, sourceProblem: problemId },
    });
    return this.mapArticle(article);
  }

  private canRead(
    article: Prisma.KnowledgeArticleGetPayload<{ include: typeof ARTICLE_INCLUDE }>,
    actor: UserContext,
  ) {
    if (article.published) return true;
    if (actor.role === 'ADMIN' || actor.role === 'MANAGER') return true;
    return article.authorId === actor.sub;
  }

  private assertOwner(article: { authorId: string }, actor: UserContext) {
    if (actor.role !== 'ADMIN' && actor.role !== 'MANAGER' && article.authorId !== actor.sub) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
  }

  private mapArticle(
    article: Prisma.KnowledgeArticleGetPayload<{ include: typeof ARTICLE_INCLUDE }>,
  ) {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      published: article.published,
      author: article.author,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }

  private async getArticle(
    id: string,
  ): Promise<Prisma.KnowledgeArticleGetPayload<{ include: typeof ARTICLE_INCLUDE }>> {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      include: ARTICLE_INCLUDE,
    });
    if (!article) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return article;
  }
}