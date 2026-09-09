import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Status } from '@prisma/client';
import { ApprovalsService } from './approvals.service.js';
import { validateStages } from '../approval-flows/approval-flows.service.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

function makeService() {
  const prisma = {
    approvalFlow: { findUnique: vi.fn() },
    ticket: { findUnique: vi.fn() },
    change: { findUnique: vi.fn() },
    approval: { findFirst: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  };
  const routing = {};
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const realtime = { emitApprovalPending: vi.fn() };
  const service = new ApprovalsService(
    prisma as never,
    routing as never,
    audit as never,
    realtime as never,
  );
  return { service, prisma, audit, realtime };
}

const actor: UserContext = {
  sub: 'manager1',
  email: 'manager@sdesk.dev',
  name: 'Manager',
  role: 'MANAGER',
  companyId: 'c1',
  solverGroupId: 'g1',
};

const flow = {
  id: 'flow1',
  name: 'Aprovacao TI',
  entityType: 'TICKET',
  status: Status.ACTIVE,
  companyId: 'c1',
  rules: {
    stages: [{ order: 1, approverRole: 'MANAGER' }],
  },
};

describe('ApprovalsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('requestForTicket', () => {
    it('creates pending approvals and emits approval.pending per approver', async () => {
      const { service, prisma, realtime } = makeService();
      const approver = {
        id: 'manager1',
        status: 'ACTIVE',
        solverGroupId: 'g1',
        role: 'MANAGER',
      };
      prisma.approvalFlow.findUnique.mockResolvedValue(flow);
      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        companyId: 'c1',
        status: 'OPEN',
      });
      prisma.approval.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValueOnce(approver);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            ticket: { update: vi.fn() },
            ticketHistory: { create: vi.fn() },
            approval: { createMany: vi.fn() },
          }),
      );
      prisma.approval.findMany.mockResolvedValue([
        { id: 'ap1', order: 1, approverId: 'manager1' },
      ]);

      const result = await service.requestForTicket('flow1', 't1', actor);

      expect(result.status).toBe('WAITING_APPROVAL');
      expect(prisma.approvalFlow.findUnique).toHaveBeenCalledWith({
        where: { id: 'flow1' },
      });
      // approve steps resolved + approvals pending
      expect(realtime.emitApprovalPending).toHaveBeenCalledTimes(1);
      expect(realtime.emitApprovalPending).toHaveBeenCalledWith(
        'manager1',
        expect.objectContaining({
          approvalId: 'ap1',
          order: 1,
          flowName: 'Aprovacao TI',
          entityType: 'TICKET',
          ticketId: 't1',
        }),
      );
    });

    it('throws when flow does not exist or is not ACTIVE', async () => {
      const { service, prisma } = makeService();
      prisma.approvalFlow.findUnique.mockResolvedValue(null);
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      prisma.approvalFlow.findUnique.mockResolvedValue({
        ...flow,
        status: Status.INACTIVE,
      });
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws for entity mismatch / ticket not found / company mismatch / closed ticket', async () => {
      const { service, prisma } = makeService();
      prisma.approvalFlow.findUnique.mockResolvedValue({
        ...flow,
        entityType: 'CHANGE',
      });
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      prisma.approvalFlow.findUnique.mockResolvedValue(flow);
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(NotFoundException);

      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        companyId: 'other',
        status: 'OPEN',
      });
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        companyId: 'c1',
        status: 'RESOLVED',
      });
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('throws when an approval is already in flight', async () => {
      const { service, prisma } = makeService();
      prisma.approvalFlow.findUnique.mockResolvedValue(flow);
      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        companyId: 'c1',
        status: 'OPEN',
      });
      prisma.approval.findFirst.mockResolvedValue({ id: 'ap1' });
      await expect(
        service.requestForTicket('flow1', 't1', actor),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('validateStages', () => {
    it('accepts well-formed rules and rejects malformed', () => {
      expect(
        validateStages({ stages: [{ order: 1, approverRole: 'MANAGER' }] }),
      ).toEqual([{ order: 1, approverRole: 'MANAGER' }]);
      expect(() => validateStages({ stages: [] })).toThrow();
      expect(() => validateStages({ stages: [{ order: 1 }] })).toThrow();
    });
  });
});
