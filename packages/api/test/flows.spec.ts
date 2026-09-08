import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Service Desk flows (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const req = (method: string, path: string, token?: string, body?: unknown) => {
    let r = request(app.getHttpServer())[method.toLowerCase() as 'post'](`/api${path}`);
    if (token) r = r.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) r = r.send(body as object);
    return r;
  };

  const expect2xx = (status: number) => {
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);
  };

  const login = async (email: string, password = 'Senha@123') => {
    const res = await req('POST', '/auth/login', undefined, { email, password });
    return { status: res.status, data: res.body?.data, body: res.body };
  };

  describe('autenticação', () => {
    it('faz login, refresh e logout revogando o token', async () => {
      const ok = await login('gustavo@sdesk.dev');
      expect2xx(ok.status);
      expect(ok.data.accessToken).toBeDefined();
      expect(ok.data.refreshToken).toBeDefined();
      expect(ok.data.user.email).toBe('gustavo@sdesk.dev');
      await wait(400);

      const wrong = await login('gustavo@sdesk.dev', 'senha-errada');
      expect(wrong.status).toBe(401);
      await wait(400);

      const refreshed = await req('POST', '/auth/refresh', undefined, {
        refreshToken: ok.data.refreshToken,
      });
      expect2xx(refreshed.status);
      expect(refreshed.body?.data?.accessToken).toBeDefined();
      expect(refreshed.body?.data?.refreshToken).toBeDefined();
      await wait(400);

      // token rotacionado: reutilizar o antigo não pode funcionar
      const reuse = await req('POST', '/auth/refresh', undefined, {
        refreshToken: ok.data.refreshToken,
      });
      expect(reuse.status).toBe(401);
      await wait(400);

      const out = await req('POST', '/auth/logout', undefined, {
        refreshToken: refreshed.body?.data?.refreshToken,
      });
      expect2xx(out.status);
      const afterLogout = await req('POST', '/auth/refresh', undefined, {
        refreshToken: refreshed.body?.data?.refreshToken,
      });
      expect(afterLogout.status).toBe(401);
    });

    it('permite apenas ADMIN criar usuário', async () => {
      const bruno = await login('bruno@sdesk.dev');
      const admin = await login('admin@sdesk.dev');
      const payload = {
        name: `E2E User ${Date.now()}`,
        email: `e2e-${Date.now()}@sdesk.dev`,
        password: 'Senha@123',
        role: 'AGENT',
      };
      const denied = await req('POST', '/users', bruno.data.accessToken, payload);
      expect(denied.status).toBe(403);
      await wait(400);
      const created = await req('POST', '/users', admin.data.accessToken, payload);
      expect2xx(created.status);
      expect(created.body?.data?.email).toBe(payload.email);
    });
  });

  describe('tickets', () => {
    let token: string;
    let ticketId: string;

    it('crud completo de ticket como MANAGER (vê toda a empresa)', async () => {
      const loginRes = await login('manager@sdesk.dev');
      token = loginRes.data.accessToken;

      const created = await req('POST', '/tickets', token, {
        title: `E2E Incidente ${Date.now()}`,
        type: 'INCIDENT',
        priority: 'HIGH',
        description: 'Descrição do incidente para teste e2e',
      });
      expect2xx(created.status);
      ticketId = created.body?.data?.id;
      expect(created.body?.data?.ticketNumber).toMatch(/^SD-\d{4}-\d+/);
      expect(['OPEN', 'IN_PROGRESS']).toContain(created.body?.data?.status);
      const initialStatus = created.body?.data?.status;
      await wait(400);

      const list = await req('GET', `/tickets?pageSize=5&status=OPEN`, token);
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body?.data)).toBe(true);
      await wait(400);

      const detail = await req('GET', `/tickets/${ticketId}`, token);
      expect(detail.status).toBe(200);
      expect(detail.body?.data?.id).toBe(ticketId);
      await wait(400);

      const updated = await req('PUT', `/tickets/${ticketId}`, token, {
        title: 'E2E Incidente (renomeado)',
      });
      expect2xx(updated.status);
      await wait(400);

      const comment = await req('POST', `/tickets/${ticketId}/comments`, token, {
        content: 'comentário público do agente',
        visibility: 'PUBLIC',
      });
      expect2xx(comment.status);
      expect(comment.body?.data?.visibility).toBe('PUBLIC');
      await wait(400);

      const next = initialStatus === 'OPEN' ? 'IN_PROGRESS' : 'PENDING';
      const st = await req('POST', `/tickets/${ticketId}/status`, token, {
        status: next,
      });
      expect2xx(st.status);
      expect(st.body?.data?.status).toBe(next);
    });
  });

  describe('aprovação completa', () => {
    it('cria fluxo, solicita, vota e resolve', async () => {
      const admin = await login('admin@sdesk.dev');
      const bruno = await login('bruno@sdesk.dev');
      const manager = await login('manager@sdesk.dev');
      const companyId = bruno.data.user.companyId;

      const flow = await req('POST', '/approval-flows', admin.data.accessToken, {
        name: `E2E Flow ${Date.now()}`,
        entityType: 'TICKET',
        status: 'ACTIVE',
        companyId,
        rules: { stages: [{ order: 1, approverRole: 'MANAGER' }] },
      });
      expect2xx(flow.status);
      const flowId = flow.body?.data?.id;
      await wait(400);

      const ticket = await req('POST', '/tickets', bruno.data.accessToken, {
        title: `E2E Pending Approve ${Date.now()}`,
        type: 'INCIDENT',
        priority: 'MEDIUM',
        description: 'Ticket para aprovação e2e',
      });
      const ticketId = ticket.body?.data?.id;
      await wait(400);

      const pending = await req(
        'POST',
        `/tickets/${ticketId}/request-approval`,
        bruno.data.accessToken,
        { flowId },
      );
      expect2xx(pending.status);
      expect(pending.body?.data?.status).toBe('WAITING_APPROVAL');
      await wait(400);

      const list = await req('GET', '/approvals?status=PENDING', manager.data.accessToken);
      expect(list.status).toBe(200);
      const approval = (list.body?.data ?? []).find(
        (a: { entity?: { type: string; id: string } }) =>
          a.entity?.type === 'TICKET' && a.entity?.id === ticketId,
      );
      expect(approval).toBeDefined();
      expect(approval.flowName).toBeDefined();
      await wait(400);

      const decided = await req(
        'POST',
        `/approvals/${approval.id}/approve`,
        manager.data.accessToken,
        { comment: 'aprovado pelo manager e2e' },
      );
      expect2xx(decided.status);
      await wait(400);

      const after = await req('GET', `/tickets/${ticketId}`, manager.data.accessToken);
      expect(after.body?.data?.status).not.toBe('WAITING_APPROVAL');
    });
  });

  describe('grupos solucionadores e escalonamento', () => {
    it('lista grupos com solvers e escalona ticket por reassign', async () => {
      const bruno = await login('bruno@sdesk.dev');
      const manager = await login('manager@sdesk.dev');

      const groups = await req('GET', '/solver-groups', manager.data.accessToken);
      expect(groups.status).toBe(200);
      const arr = groups.body?.data ?? [];
      expect(arr.length).toBeGreaterThan(0);
      const target = arr[arr.length - 1];
      await wait(400);

      const ticket = await req('POST', '/tickets', bruno.data.accessToken, {
        title: `E2E Escalonar ${Date.now()}`,
        type: 'INCIDENT',
        priority: 'LOW',
        description: 'Ticket para escalonamento e2e',
      });
      const ticketId = ticket.body?.data?.id;
      await wait(400);

      const reassign = await req(
        'POST',
        '/tickets/reassign',
        manager.data.accessToken,
        {
          ticketIds: [ticketId],
          solverGroupId: target.id,
          reason: 'escalonamento e2e',
        },
      );
      expect2xx(reassign.status);
      await wait(400);

      const after = await req('GET', `/tickets/${ticketId}`, manager.data.accessToken);
      expect(after.body?.data?.solverGroup?.id).toBe(target.id);
    });
  });
});