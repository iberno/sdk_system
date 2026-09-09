import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string[];
  defaultCompanyId: string | null;
  jwt: JwtConfig;
}

function toArray(value: string | undefined): string[] {
  if (!value) return ['*'];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const appConfig = registerAs('app', (): AppConfig => ({
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: toArray(process.env.CORS_ORIGIN),
  defaultCompanyId: process.env.DEFAULT_COMPANY_ID ?? null,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'default_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'default_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
}));

export default appConfig;
