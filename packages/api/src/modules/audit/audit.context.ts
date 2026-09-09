import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditRequestContext {
  ip?: string;
  userAgent?: string;
}

export const auditStorage = new AsyncLocalStorage<AuditRequestContext>();
