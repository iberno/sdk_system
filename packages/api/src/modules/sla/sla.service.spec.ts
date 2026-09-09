import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SLAType, Status } from '@prisma/client';
import { SlaService } from './sla.service.js';

function makeService() {
  const prisma = {
    sLAPolicy: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const service = new SlaService(prisma as never);
  return { service, prisma };
}

const policy = {
  id: 'p1',
  name: 'Critico',
  type: 'INCIDENT',
  priority: 'CRITICAL',
  responseTime: 15,
  resolveTime: 240,
  status: 'ACTIVE',
};

describe('SlaService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('calculate', () => {
    it('uses the active policy response/resolve times', async () => {
      const { service, prisma } = makeService();
      prisma.sLAPolicy.findFirst.mockResolvedValue(policy);
      const now = Date.now();
      const result = await service.calculate(SLAType.INCIDENT, 'CRITICAL');

      expect(result.responseMinutes).toBe(15);
      expect(result.resolveMinutes).toBe(240);
      expect(result.slaResponseAt.getTime()).toBeGreaterThanOrEqual(
        now + 15 * 60_000,
      );
      expect(result.slaResolveAt.getTime()).toBeGreaterThanOrEqual(
        now + 240 * 60_000,
      );
    });

    it('falls back to defaults (480/2880) with no policy', async () => {
      const { service, prisma } = makeService();
      prisma.sLAPolicy.findFirst.mockResolvedValue(null);
      const now = Date.now();
      const result = await service.calculate(SLAType.SERVICE_REQUEST, 'LOW');

      expect(result.responseMinutes).toBe(480);
      expect(result.resolveMinutes).toBe(2880);
      expect(result.slaResponseAt.getTime()).toBe(now + 480 * 60_000);
    });
  });

  describe('create', () => {
    it('rejects duplicate type+priority pair', async () => {
      const { service, prisma } = makeService();
      prisma.sLAPolicy.findFirst.mockResolvedValue(policy);
      await expect(
        service.create({
          name: 'X',
          type: SLAType.INCIDENT,
          priority: 'CRITICAL',
          responseTime: 10,
          resolveTime: 120,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a policy when the pair is free', async () => {
      const { service, prisma } = makeService();
      prisma.sLAPolicy.findFirst.mockResolvedValue(null);
      prisma.sLAPolicy.create.mockResolvedValue(policy);
      const result = await service.create({
        name: 'X',
        type: SLAType.INCIDENT,
        priority: 'HIGH',
        responseTime: 10,
        resolveTime: 120,
      });
      expect(prisma.sLAPolicy.create).toHaveBeenCalledTimes(1);
      expect(result).toBe(policy);
    });
  });

  it('findOne throws NotFound when missing', async () => {
    const { service, prisma } = makeService();
    prisma.sLAPolicy.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updateStatus/thrown NotFound are deferred by findOne validation', async () => {
    const { service, prisma } = makeService();
    prisma.sLAPolicy.findUnique.mockResolvedValue(null);
    await expect(
      service.updateStatus('nope', Status.INACTIVE),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
