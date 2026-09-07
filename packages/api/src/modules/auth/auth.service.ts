import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { compare } from 'bcryptjs';
import { UserRoleType, UserContext } from './interfaces/auth-user.interface.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  return value * multipliers[unit];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException({ key: 'errors.invalid_credentials', error: 'Unauthorized' });
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ key: 'errors.account_inactive', error: 'Unauthorized' });
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException({ key: 'errors.invalid_credentials', error: 'Unauthorized' });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRoleType,
      companyId: user.companyId,
      solverGroupId: user.solverGroupId,
      status: user.status,
      locale: user.locale,
    };
  }

  private signAccessToken(user: {
    id: string;
    email: string;
    name: string;
    role: UserRoleType;
    companyId: string | null;
    solverGroupId: string | null;
  }): string {
    const payload: UserContext = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      solverGroupId: user.solverGroupId,
    };
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    } as JwtSignOptions);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const ttl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const expiresAt = new Date(Date.now() + ttlToSeconds(ttl) * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: sha256(raw),
        userId,
        expiresAt,
      },
    });

    return raw;
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string;
    role: UserRoleType;
    companyId: string | null;
    solverGroupId: string | null;
    status: string;
    locale: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      solverGroupId: user.solverGroupId,
      locale: user.locale,
    };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);
    const expiresIn = ttlToSeconds(this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m');

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const hash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ key: 'errors.invalid_refresh_token', error: 'Unauthorized' });
    }

    const user = stored.user;
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ key: 'errors.account_inactive', error: 'Unauthorized' });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const accessToken = this.signAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRoleType,
      companyId: user.companyId,
      solverGroupId: user.solverGroupId,
    });
    const rotated = await this.createRefreshToken(user.id);
    const expiresIn = ttlToSeconds(this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m');

    return {
      accessToken,
      refreshToken: rotated,
      expiresIn,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: sha256(refreshToken), revoked: false },
      data: { revoked: true },
    });
    return { success: true };
  }
}