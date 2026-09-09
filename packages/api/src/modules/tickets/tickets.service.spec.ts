import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';

function makeService() {
  const prisma = {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    ticketComment: {
      create: vi.fn(),
    },
    ticketHistory: { create: vi.fn() },
  };
  const sequence = { next: vi.fn().mockResolvedValue(1) };
  const sla = { calculate: vi.fn() };
  const routing = { resolve: vi.fn() };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const realtime = {
    emitTicketCreated: vi.fn(),
    emitTicketUpdated: vi.fn(),
    emitTicketCommented: vi.fn(),
    emitSlaBreached: vi.fn(),
  };
  const service = new TicketsService(
    prisma as never,
    sequence as never,
    sla as never,
    routing as never,
    audit as never,
    realtime as never,
  );
  return { service, prisma, audit, realtime };
}

const baseTicket = {
  id: 't1',
  ticketNumber: 'INC-00042',
  companyId: 'c1',
  solverGroupId: 'g1',
  status: 'OPEN',
  slaBreached: false,
  slaResolveAt: new Date(Date.now() + 60_000),
  resolvedAt: null,
  closedAt: null,
  requesterId: 'r1',
  beneficiaryId: null,
  assigneeId: null,
  approvals: [],
};

const adminActor = {
  sub: 'admin1',
  email: 'admin@sdesk.dev',
  name: 'Admin',
  role: 'ADMIN',
  companyId: 'c1',
  solverGroupId: null,
};

describe('TicketsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('checkSlaState', () => {
    it('does nothing when the ticket is already breached', async () => {
      const { service, prisma, realtime } = makeService();
      const svc = service as never as {
        checkSlaState: (t: never) => Promise<boolean>;
      };
      const ok = await svc.checkSlaState({
        ...baseTicket,
        slaBreached: true,
      } as never);
      expect(ok).toBe(false);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
      expect(realtime.emitSlaBreached).not.toHaveBeenCalled();
    });

    it('does nothing for RESOLVED/CLOSED or null SLA', async () => {
      const { service, prisma, realtime } = makeService();
      const svc = service as never as {
        checkSlaState: (t: never) => Promise<boolean>;
      };
      await svc.checkSlaState({ ...baseTicket, status: 'RESOLVED' } as never);
      await svc.checkSlaState({ ...baseTicket, status: 'CLOSED' } as never);
      await svc.checkSlaState({ ...baseTicket, slaResolveAt: null } as never);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
      expect(realtime.emitSlaBreached).not.toHaveBeenCalled();
    });

    it('does nothing when SLA is still within time', async () => {
      const { service, prisma, realtime } = makeService();
      const svc = service as never as {
        checkSlaState: (t: never) => Promise<boolean>;
      };
      await svc.checkSlaState({ ...baseTicket } as never);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
      expect(realtime.emitSlaBreached).not.toHaveBeenCalled();
    });

    it('marks breach and emits sla.breached on overdue open ticket', async () => {
      const { service, prisma, realtime } = makeService();
      const svc = service as never as {
        checkSlaState: (t: never) => Promise<boolean>;
      };
      prisma.ticket.update.mockResolvedValue({});
      const overdue = {
        ...baseTicket,
        slaResolveAt: new Date(Date.now() - 3_600_000),
      };
      const isBreach = await svc.checkSlaState(overdue as never);

      expect(isBreach).toBe(true);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { slaBreached: true },
      });
      expect(realtime.emitSlaBreached).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 't1',
          companyId: 'c1',
          solverGroupId: 'g1',
        }),
      );
    });
  });

  describe('addComment', () => {
    it('rejects INTERNAL comment by a non-team member', async () => {
      const { service } = makeService();
      const svc = service as never as {
        addComment: (id: string, dto: never, actor: never) => Promise<unknown>;
      };
      (
        service as unknown as { getTicketDetail: () => Promise<unknown> }
      ).getTicketDetail = vi.fn().mockResolvedValue(baseTicket);
      await expect(
        svc.addComment(
          't1',
          { content: 'x', visibility: 'INTERNAL' } as never,
          {
            ...adminActor,
            role: 'USER',
            sub: 'some-user',
            solverGroupId: null,
          } as never,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates comment and emits ticket.commented for an authorized team member', async () => {
      const { service, prisma, realtime, audit } = makeService();
      const svc = service as never as {
        addComment: (id: string, dto: never, actor: never) => Promise<unknown>;
      };
      (
        service as unknown as { getTicketDetail: () => Promise<unknown> }
      ).getTicketDetail = vi.fn().mockResolvedValue(baseTicket);
      prisma.ticketComment.create.mockResolvedValue({
        id: 'cm1',
        content: 'vejo',
        visibility: 'INTERNAL',
        createdAt: new Date(),
        author: { id: 'admin1', name: 'Admin', role: 'ADMIN' },
      });

      await svc.addComment(
        't1',
        { content: 'vejo', visibility: 'INTERNAL' } as never,
        adminActor as never,
      );

      expect(prisma.ticketComment.create).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COMMENT',
          entity: 'Ticket',
          entityId: 't1',
        }),
      );
      expect(realtime.emitTicketCommented).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 't1',
          commentId: 'cm1',
          companyId: 'c1',
        }),
      );
    });

    it('rejects comment on a CLOSED ticket', async () => {
      const { service } = makeService();
      const svc = service as never as {
        addComment: (id: string, dto: never, actor: never) => Promise<unknown>;
      };
      (
        service as unknown as { getTicketDetail: () => Promise<unknown> }
      ).getTicketDetail = vi
        .fn()
        .mockResolvedValue({ ...baseTicket, status: 'CLOSED' });
      await expect(
        svc.addComment(
          't1',
          { content: 'x', visibility: 'PUBLIC' } as never,
          adminActor as never,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });
});
