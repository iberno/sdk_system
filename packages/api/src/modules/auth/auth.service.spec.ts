import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

import { compare } from 'bcryptjs';

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = makePrisma();
  const jwt = { sign: vi.fn(() => 'jwt-access-token') };
  const config = {
    get: vi.fn((key: string) => {
      if (overrides[key]) return overrides[key];
      return null;
    }),
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    prisma as never,
    jwt as never,
    config as never,
    audit as never,
  );
  return { service, prisma, jwt, config, audit };
}

const userRow = {
  id: 'u1',
  email: 'bruno@sdesk.dev',
  name: 'Bruno Lima',
  password: 'sub',
  role: 'AGENT',
  companyId: 'c1',
  solverGroupId: 'g1',
  status: 'ACTIVE',
  locale: 'pt-BR',
  company: null,
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  describe('validateUser', () => {
    it('returns sanitized user on valid credentials', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(userRow);
      const result = await service.validateUser('bruno@sdesk.dev', 'Senha@123');
      expect(result).toMatchObject({
        id: 'u1',
        email: 'bruno@sdesk.dev',
        role: 'AGENT',
        companyId: 'c1',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('rejects when user does not exist', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.validateUser('nope@x.com', 'x'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects inactive account', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({
        ...userRow,
        status: 'INACTIVE',
      });
      await expect(
        service.validateUser('bruno@sdesk.dev', 'Senha@123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong password', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue(userRow);
      (compare as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      await expect(
        service.validateUser('bruno@sdesk.dev', 'errada'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('issues tokens, persists refresh hash and audits LOGIN', async () => {
      const { service, prisma, jwt } = makeService();
      prisma.user.findUnique.mockResolvedValue(userRow);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

      const result = await service.login('bruno@sdesk.dev', 'Senha@123');

      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.user.id).toBe('u1');
      // default JWT_ACCESS_EXPIRES_IN -> 15m
      expect(result.expiresIn).toBe(900);
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      // refresh token armazenado como hash (nao em texto)
      const data = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(data.token).not.toContain('jwt-access-token');
      expect(data.userId).toBe('u1');
    });

    it('audits LOGIN with entityId = userId', async () => {
      const { service, prisma, audit } = makeService();
      prisma.user.findUnique.mockResolvedValue(userRow);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

      await service.login('bruno@sdesk.dev', 'Senha@123');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN',
          entity: 'User',
          entityId: 'u1',
          userId: 'u1',
        }),
      );
    });
  });

  describe('refresh', () => {
    it('rejects unknown/revoked/expired token', async () => {
      const { service, prisma } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('anything')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: true,
        expiresAt: new Date(Date.now() + 1000),
      });
      await expect(service.refresh('anything')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('anything')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects when user is inactive', async () => {
      const { service, prisma } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: false,
        expiresAt: new Date(Date.now() + 1000),
        user: { ...userRow, status: 'INACTIVE' },
      });
      await expect(service.refresh('anything')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates the token (revokes old, stores new) and returns new access', async () => {
      const { service, prisma, jwt } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: false,
        expiresAt: new Date(Date.now() + 1000),
        user: userRow,
      });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt2' });

      const result = await service.refresh('raw-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(jwt.sign).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('revokes the refresh token and audits LOGOUT', async () => {
      const { service, prisma, audit } = makeService();
      prisma.refreshToken.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('raw-token');

      expect(result).toEqual({ success: true });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ revoked: false }),
        data: { revoked: true },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
          entityId: 'u1',
          userId: 'u1',
        }),
      );
    });
  });
});
