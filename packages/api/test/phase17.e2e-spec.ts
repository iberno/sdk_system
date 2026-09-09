import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import { AppModule } from './../src/app.module.js';

const MARK = '[E2E17]';
const EMAIL_SUFFIX = '@e2e17.sdesk.dev';
const PASSWORD = 'Senha@123';

type TokenMap = Record<string, string>;

describe('Fase 17 — Integração completa (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seqBefore: { id: string; lastValue: number }[];

  const tokens: TokenMap = {};
  let n1Group: { id: string; name: string };
  let redeGroup: { id: string; name: string };
  let betaCompanyId: string;
  let agentAnaId: string;
  let agentBrunoId: string;
  let agentFabioId: string;

  const api = (
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    token?: string,
    body?: unknown,
  ) => {
    let r = request(app.getHttpServer())[method](`/api${path}`) as request.Test;
    if (token) r = r.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) r = r.send(body as object);
    return r;
  };

  const login = async (email: string) => {
    const res = await api('post', '/auth/login', undefined, { email, password: PASSWORD });
    expect(res.status).toBe(200);
    const data = res.body.data as {
      accessToken: string;
      user: { id: string; role: string; companyId: string };
    };
    return data;
  };

  const createTicket = async (token: string, over: Record<string, unknown>) => {
    const res = await api(
      'post',
      '/tickets',
      token,
      {
        ...over,
        title: `${MARK} ${over.title}`,
        description:
          (over.description as string | undefined) ??
          'Descrição criada pelo teste E2E da Fase 17',
      },
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    return res.body.data as Record<string, any>;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = new PrismaClient();
    seqBefore = await prisma.sequenceCounter.findMany({
      select: { id: true, lastValue: true },
    });

    const admin = await login('admin@sdesk.dev');
    const manager = await login('manager@sdesk.dev');
    const ana = await login('ana@sdesk.dev');
    const bruno = await login('bruno@sdesk.dev');
    const fabio = await login('fabio@sdesk.dev');
    const gustavo = await login('gustavo@sdesk.dev');

    tokens.admin = admin.accessToken;
    tokens.manager = manager.accessToken;
    tokens.ana = ana.accessToken;
    tokens.bruno = bruno.accessToken;
    tokens.fabio = fabio.accessToken;
    tokens.gustavo = gustavo.accessToken;
    agentAnaId = ana.user.id;
    agentBrunoId = bruno.user.id;
    agentFabioId = fabio.user.id;

    const companies = await api('get', '/companies', tokens.admin);
    const companyRows = companies.body.data as Array<{ id: string; name: string }>;
    betaCompanyId = companyRows.find((c) => c.name === 'Beta Ltda')!.id;

    const groups = await api('get', '/solver-groups', tokens.manager);
    const groupRows = groups.body.data as Array<{ id: string; name: string }>;
    n1Group = groupRows.find((g) => g.name === 'Suporte N1')!;
    redeGroup = groupRows.find((g) => g.name === 'Rede')!;
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      const testUsers = await prisma.user.findMany({
        where: { email: { endsWith: EMAIL_SUFFIX } },
        select: { id: true },
      });
      const userIds = testUsers.map((u) => u.id);
      const tickets = await prisma.ticket.findMany({
        where: { title: { contains: MARK } },
        select: { id: true },
      });
      const ticketIds = tickets.map((t) => t.id);
      const problems = await prisma.problem.findMany({
        where: { title: { contains: MARK } },
        select: { id: true },
      });
      const problemIds = problems.map((p) => p.id);
      const changes = await prisma.change.findMany({
        where: { title: { contains: MARK } },
        select: { id: true },
      });
      const changeIds = changes.map((c) => c.id);
      const articles = await prisma.knowledgeArticle.findMany({
        where: { title: { contains: MARK } },
        select: { id: true },
      });
      const articleIds = articles.map((a) => a.id);
      const allEntityIds = [...ticketIds, ...problemIds, ...changeIds, ...articleIds];

      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            ...(userIds.length ? [{ userId: { in: userIds } }] : []),
            ...(allEntityIds.length ? [{ entityId: { in: allEntityIds } }] : []),
          ],
        },
      });
      await prisma.approval.deleteMany({
        where: {
          OR: [
            ...(ticketIds.length ? [{ ticketId: { in: ticketIds } }] : []),
            ...(changeIds.length ? [{ changeId: { in: changeIds } }] : []),
          ],
        },
      });
      await prisma.changeTicket.deleteMany({ where: { changeId: { in: changeIds } } });
      await prisma.problemTicket.deleteMany({ where: { problemId: { in: problemIds } } });
      await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await prisma.ticketHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await prisma.ticketComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
      // Problem.proposedChangeId referencia Change: problema antes da mudança
      await prisma.problem.deleteMany({ where: { id: { in: problemIds } } });
      await prisma.change.deleteMany({ where: { id: { in: changeIds } } });
      await prisma.knowledgeArticle.deleteMany({ where: { id: { in: articleIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });

      // Restaura contadores de sequência ao estado pré-teste
      for (const s of seqBefore) {
        await prisma.sequenceCounter.update({
          where: { id: s.id },
          data: { lastValue: s.lastValue },
        });
      }
      await prisma.sequenceCounter.deleteMany({
        where: { id: { notIn: seqBefore.map((s) => s.id) } },
      });
    } finally {
      await prisma.$disconnect();
      await app.close();
    }
  });

  describe('Login → Dashboard', () => {
    it('AGENT acessa o resumo do dashboard; USER é bloqueado', async () => {
      const dash = await api('get', '/dashboard/summary', tokens.ana);
      expect(dash.status).toBe(200);
      expect(dash.body.data.totals.openTickets).toBeGreaterThanOrEqual(0);
      expect(dash.body.data).toHaveProperty('byPriority');
      expect(dash.body.data).toHaveProperty('trend');

      const denied = await api('get', '/dashboard/summary', tokens.gustavo);
      expect(denied.status).toBe(403);
    });
  });

  describe('Roteamento automático por RoutingRule', () => {
    let toGroup: Record<string, any>;
    let roundRobin: Record<string, any>;

    it('INCIDENT é roteado para o grupo da regra TO_GROUP (sem agente)', async () => {
      toGroup = await createTicket(tokens.gustavo, {
        title: 'Roteamento TO_GROUP',
        type: 'INCIDENT',
        priority: 'LOW',
      });
      expect(toGroup.status).toBe('OPEN');
      expect(toGroup.solverGroup?.id).toBe(n1Group.id);
      expect(toGroup.assignee).toBeNull();
      expect(toGroup.routedBy?.auto).toBe(true);
      expect(toGroup.routedBy?.strategy).toBe('TO_GROUP');
      expect(toGroup.company?.name).toBe('ACME Corp');
    });

    it('SERVICE_REQUEST MEDIUM usa ROUND_ROBIN e ganha agente', async () => {
      roundRobin = await createTicket(tokens.gustavo, {
        title: 'Roteamento ROUND_ROBIN',
        type: 'SERVICE_REQUEST',
        priority: 'MEDIUM',
      });
      expect(roundRobin.status).toBe('IN_PROGRESS');
      expect(roundRobin.solverGroup?.id).toBe(n1Group.id);
      expect(roundRobin.assignee).not.toBeNull();
      expect([agentAnaId, agentBrunoId]).toContain(roundRobin.assignee?.id);
      expect(roundRobin.routedBy?.strategy).toBe('ROUND_ROBIN');
    });

    it('os dois tickets aparecem na fila do grupo N1', async () => {
      const queue = await api('get', `/tickets?solverGroupId=${n1Group.id}`, tokens.ana);
      expect(queue.status).toBe(200);
      const items = queue.body.data as Array<{ ticketNumber: string }>;
      const numbers = items.map((i) => i.ticketNumber);
      expect(numbers).toContain(toGroup.ticketNumber);
      expect(numbers).toContain(roundRobin.ticketNumber);
    });
  });

  describe('Pickup, atribuição e resolução', () => {
    let unassigned: Record<string, any>;

    beforeAll(async () => {
      unassigned = await createTicket(tokens.gustavo, {
        title: 'Pickup e resolução',
        type: 'INCIDENT',
        priority: 'LOW',
      });
    });

    it('AGENT do grupo faz pickup e o ticket fica IN_PROGRESS', async () => {
      const pick = await api(
        'post',
        `/tickets/${unassigned.id}/pickup`,
        tokens.ana,
        { solverGroupId: n1Group.id },
      );
      expect(pick.status).toBeGreaterThanOrEqual(200);
      expect(pick.status).toBeLessThan(300);
      expect(pick.body.data.assignee?.id).toBe(agentAnaId);
      expect(pick.body.data.status).toBe('IN_PROGRESS');
    });

    it('segundo pickup do mesmo ticket falha com 422 (já reivindicado)', async () => {
      const again = await api(
        'post',
        `/tickets/${unassigned.id}/pickup`,
        tokens.bruno,
        { solverGroupId: n1Group.id },
      );
      expect(again.status).toBe(422);
      expect(again.body.i18n?.key).toBe('business.ticket_already_claimed');
    });

    it('AGENT resolve e fecha o ticket', async () => {
      const resolved = await api(
        'post',
        `/tickets/${unassigned.id}/status`,
        tokens.ana,
        { status: 'RESOLVED', resolutionNote: 'Resolvido pelo teste E2E da Fase 17' },
      );
      expect(resolved.status).toBeGreaterThanOrEqual(200);
      expect(resolved.status).toBeLessThan(300);
      expect(resolved.body.data.status).toBe('RESOLVED');
      expect(resolved.body.data.resolvedAt).toBeTruthy();

      const closed = await api(
        'post',
        `/tickets/${unassigned.id}/status`,
        tokens.ana,
        { status: 'CLOSED' },
      );
      expect(closed.status).toBeGreaterThanOrEqual(200);
      expect(closed.status).toBeLessThan(300);
      expect(closed.body.data.status).toBe('CLOSED');
      expect(closed.body.data.closedAt).toBeTruthy();
    });
  });

  describe('Atribuição manual fora do grupo → 422', () => {
    let ticket: Record<string, any>;

    beforeAll(async () => {
      ticket = await createTicket(tokens.gustavo, {
        title: 'Atribuição fora do grupo',
        type: 'INCIDENT',
        priority: 'LOW',
      });
    });

    it('atribuir agente de outro grupo com grupo explícito retorna 422', async () => {
      const res = await api(
        'post',
        `/tickets/${ticket.id}/assign`,
        tokens.manager,
        { assigneeId: agentFabioId, solverGroupId: n1Group.id },
      );
      expect(res.status).toBe(422);
      expect(res.body.i18n?.key).toBe('business.agent_not_in_group');
    });

    it('atribuir só o agente move o ticket para o grupo do agente', async () => {
      const res = await api(
        'post',
        `/tickets/${ticket.id}/assign`,
        tokens.manager,
        { assigneeId: agentFabioId },
      );
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
      expect(res.body.data.assignee?.id).toBe(agentFabioId);
      expect(res.body.data.solverGroup?.id).toBe(redeGroup.id);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });
  });

  describe('Mudança → aprovação → execução', () => {
    let changeId: string;

    it('AGENT cria mudança NORMAL e submete para aprovação', async () => {
      const created = await api(
        'post',
        '/changes',
        tokens.ana,
        {
          title: `${MARK} Migração de banco`,
          description: 'Migração de versão para o teste E2E da Fase 17',
          type: 'NORMAL',
          risk: 'HIGH',
          reason: 'Validação do fluxo de aprovação na Fase 17',
          plan: '1. Backup 2. Migrar 3. Validar',
          rollbackPlan: 'Restaurar snapshot',
        },
      );
      expect(created.status).toBeGreaterThanOrEqual(200);
      expect(created.status).toBeLessThan(300);
      expect(created.body.data.status).toBe('DRAFT');
      changeId = created.body.data.id;

      const submitted = await api('post', `/changes/${changeId}/submit`, tokens.ana);
      expect(submitted.status).toBeGreaterThanOrEqual(200);
      expect(submitted.status).toBeLessThan(300);
      expect(submitted.body.data.status).toBe('PENDING_APPROVAL');
      const pending = (submitted.body.data.approvals as Array<{ status: string }>).filter(
        (a) => a.status === 'PENDING',
      );
      expect(pending).toHaveLength(2);
    });

    it('MANAGER e ADMIN aprovam as duas etapas e a mudança fica APPROVED', async () => {
      const managerList = await api('get', '/approvals', tokens.manager);
      const managerApproval = (managerList.body.data as any[]).find(
        (a) => a.entity?.type === 'CHANGE' && a.entity?.id === changeId,
      );
      expect(managerApproval).toBeDefined();

      const approved1 = await api(
        'post',
        `/approvals/${managerApproval.id}/approve`,
        tokens.manager,
        { comment: 'aprovado pelo manager (E2E17)' },
      );
      expect(approved1.status).toBeGreaterThanOrEqual(200);
      expect(approved1.status).toBeLessThan(300);

      const stillPending = await api('get', `/changes/${changeId}`, tokens.ana);
      expect(stillPending.body.data.status).toBe('PENDING_APPROVAL');

      const adminList = await api('get', '/approvals', tokens.admin);
      const adminApproval = (adminList.body.data as any[]).find(
        (a) => a.entity?.type === 'CHANGE' && a.entity?.id === changeId,
      );
      expect(adminApproval).toBeDefined();

      const approved2 = await api(
        'post',
        `/approvals/${adminApproval.id}/approve`,
        tokens.admin,
        { comment: 'aprovado pelo admin (E2E17)' },
      );
      expect(approved2.status).toBeGreaterThanOrEqual(200);
      expect(approved2.status).toBeLessThan(300);

      const after = await api('get', `/changes/${changeId}`, tokens.ana);
      expect(after.body.data.status).toBe('APPROVED');
    });

    it('executa a mudança até COMPLETED', async () => {
      const start = await api('post', `/changes/${changeId}/execute`, tokens.ana);
      expect(start.status).toBeGreaterThanOrEqual(200);
      expect(start.status).toBeLessThan(300);
      expect(start.body.data.status).toBe('IN_PROGRESS');

      const done = await api('post', `/changes/${changeId}/execute`, tokens.ana);
      expect(done.status).toBeGreaterThanOrEqual(200);
      expect(done.status).toBeLessThan(300);
      expect(done.body.data.status).toBe('COMPLETED');
    });

    it('USER não pode criar mudança', async () => {
      const denied = await api(
        'post',
        '/changes',
        tokens.gustavo,
        {
          title: `${MARK} Bloqueado`,
          description: 'não deve criar',
          reason: 'não deve criar',
          plan: 'não deve criar',
          rollbackPlan: 'não deve criar',
        },
      );
      expect(denied.status).toBe(403);
    });
  });

  describe('Problema → mudança → base de conhecimento', () => {
    let problemId: string;

    it('AGENT cria problema e propõe mudança', async () => {
      const created = await api(
        'post',
        '/problems',
        tokens.ana,
        {
          title: `${MARK} Quedas de rede no polo`,
          description: 'Quedas recorrentes identificadas no teste E2E da Fase 17',
          impact: 'HIGH',
        },
      );
      expect(created.status).toBeGreaterThanOrEqual(200);
      expect(created.status).toBeLessThan(300);
      expect(created.body.data.status).toBe('OPEN');
      problemId = created.body.data.id;

      const proposal = await api('post', `/problems/${problemId}/propose-change`, tokens.ana);
      expect(proposal.status).toBeGreaterThanOrEqual(200);
      expect(proposal.status).toBeLessThan(300);
      expect(proposal.body.data.status).toBe('DRAFT');

      const dup = await api('post', `/problems/${problemId}/propose-change`, tokens.ana);
      expect(dup.status).toBe(422);
      expect(dup.body.i18n?.key).toBe('business.problem_has_proposal');
    });

    it('resolve o problema e publica artigo na KB', async () => {
      const resolved = await api(
        'put',
        `/problems/${problemId}`,
        tokens.ana,
        { status: 'RESOLVED', solution: 'Substituição do switch do polo e atualização de firmware' },
      );
      expect(resolved.status).toBeGreaterThanOrEqual(200);
      expect(resolved.status).toBeLessThan(300);
      expect(resolved.body.data.status).toBe('RESOLVED');

      const article = await api('post', `/problems/${problemId}/publish-article`, tokens.ana);
      expect(article.status).toBeGreaterThanOrEqual(200);
      expect(article.status).toBeLessThan(300);
      expect(article.body.data.published).toBe(true);
      expect(article.body.data.title).toContain('Solução:');

      const kb = await api('get', `/knowledge?search=Quedas`, tokens.gustavo);
      expect(kb.status).toBe(200);
      const items = kb.body.data as any[];
      expect(items.some((a) => a.id === article.body.data.id)).toBe(true);
    });
  });

  describe('Matriz de roles', () => {
    let ownTicket: Record<string, any>;

    beforeAll(async () => {
      ownTicket = await createTicket(tokens.gustavo, {
        title: 'Matriz de roles',
        type: 'INCIDENT',
        priority: 'LOW',
      });
    });

    it('USER: lê o que é seu, mas não acessa admin nem altera tickets', async () => {
      expect((await api('get', '/users', tokens.gustavo)).status).toBe(403);
      expect((await api('get', '/solver-groups', tokens.gustavo)).status).toBe(403);
      expect((await api('post', '/users', tokens.gustavo, {})).status).toBe(403);
      expect(
        (
          await api('post', '/knowledge', tokens.gustavo, {
            title: `${MARK} nope`,
            content: 'nope',
            category: 'x',
          })
        ).status,
      ).toBe(403);
      expect((await api('get', '/knowledge', tokens.gustavo)).status).toBe(200);

      // USER não pode editar o próprio ticket (só comentar/transicionar p/ CLOSED)
      const upd = await api('put', `/tickets/${ownTicket.id}`, tokens.gustavo, {
        title: `${MARK} tentativa`,
      });
      expect(upd.status).toBe(403);

      // e não pode mover para IN_PROGRESS (transição restrita ao time)
      const st = await api('post', `/tickets/${ownTicket.id}/status`, tokens.gustavo, {
        status: 'IN_PROGRESS',
      });
      expect(st.status).toBe(403);
    });

    it('AGENT: vê grupos, não vê usuários, publica KB e comenta INTERNAL', async () => {
      expect((await api('get', '/solver-groups', tokens.ana)).status).toBe(200);
      expect((await api('get', '/users', tokens.ana)).status).toBe(403);

      const kb = await api(
        'post',
        '/knowledge',
        tokens.ana,
        { title: `${MARK} Rascunho do agente`, content: 'conteúdo', category: 'Guia', tags: ['e2e'] },
      );
      expect(kb.status).toBeGreaterThanOrEqual(200);
      expect(kb.status).toBeLessThan(300);
      expect(kb.body.data.published).toBe(false);

      const comment = await api(
        'post',
        `/tickets/${ownTicket.id}/comments`,
        tokens.ana,
        { content: 'comentário interno do agente (E2E17)', visibility: 'INTERNAL' },
      );
      expect(comment.status).toBeGreaterThanOrEqual(200);
      expect(comment.status).toBeLessThan(300);
    });

    it('MANAGER: lista usuários e grupos, mas não cria usuários', async () => {
      expect((await api('get', '/users', tokens.manager)).status).toBe(200);
      expect((await api('get', '/solver-groups', tokens.manager)).status).toBe(200);
      const denied = await api(
        'post',
        '/users',
        tokens.manager,
        { name: `${MARK} nope`, email: `nope${Date.now()}${EMAIL_SUFFIX}`, password: PASSWORD, role: 'USER' },
      );
      expect(denied.status).toBe(403);
    });

    it('ADMIN: cria usuário e acessa empresas', async () => {
      expect((await api('get', '/companies', tokens.admin)).status).toBe(200);
      const created = await api(
        'post',
        '/users',
        tokens.admin,
        {
          name: `${MARK} Usuário admin`,
          email: `admin-cria-${Date.now()}${EMAIL_SUFFIX}`,
          password: PASSWORD,
          role: 'USER',
        },
      );
      expect(created.status).toBeGreaterThanOrEqual(200);
      expect(created.status).toBeLessThan(300);
      expect(created.body.data.email).toContain(EMAIL_SUFFIX);
    });
  });

  describe('Multiempresa — sem vazamento de dados', () => {
    let betaTicket: Record<string, any>;
    let betaToken: string;
    let betaUserId: string;

    it('usuário da Beta Ltda cria ticket na própria empresa', async () => {
      const email = `beta-${Date.now()}${EMAIL_SUFFIX}`;
      const created = await api(
        'post',
        '/users',
        tokens.admin,
        { name: `${MARK} Usuário Beta`, email, password: PASSWORD, role: 'USER', companyId: betaCompanyId },
      );
      expect(created.status).toBeGreaterThanOrEqual(200);
      expect(created.status).toBeLessThan(300);

      const betaUser = await login(email);
      betaToken = betaUser.accessToken;
      betaUserId = betaUser.user.id;
      expect(betaUser.user.companyId).toBe(betaCompanyId);

      betaTicket = await createTicket(betaToken, {
        title: 'Ticket da empresa Beta',
        type: 'INCIDENT',
        priority: 'MEDIUM',
      });
      expect(betaTicket.company?.name).toBe('Beta Ltda');
      // número próprio por empresa: a Beta também começa em SD-2026-000001
      expect(betaTicket.ticketNumber).toBe('SD-2026-000001');
    });

    it('ACME não enxerga o ticket da Beta', async () => {
      const managerList = await api('get', '/tickets', tokens.manager);
      const managerItems = managerList.body.data as Array<{ id: string; company?: { name: string } | null }>;
      expect(managerItems.some((t) => t.id === betaTicket.id)).toBe(false);
      for (const t of managerItems) {
        if (t.company) expect(t.company.name).toBe('ACME Corp');
      }

      const agentList = await api('get', '/tickets', tokens.ana);
      const agentItems = agentList.body.data as Array<{ id: string }>;
      expect(agentItems.some((t) => t.id === betaTicket.id)).toBe(false);
    });

    it('a Beta só vê os próprios tickets; ADMIN vê tudo com filtro', async () => {
      const betaList = await api('get', '/tickets', betaToken);
      const betaItems = betaList.body.data as Array<{
        id: string;
        requester?: { id: string } | null;
        beneficiary?: { id: string } | null;
      }>;
      expect(betaItems.some((t) => t.id === betaTicket.id)).toBe(true);
      for (const t of betaItems) {
        expect(t.requester?.id ?? t.beneficiary?.id).toBe(betaUserId);
      }

      const acmeOnly = await api('get', `/tickets?companyId=${betaCompanyId}`, tokens.admin);
      const acmeItems = acmeOnly.body.data as Array<{ id: string }>;
      expect(acmeItems.some((t) => t.id === betaTicket.id)).toBe(true);
      expect(acmeItems.length).toBeGreaterThanOrEqual(1);
    });
  });
});