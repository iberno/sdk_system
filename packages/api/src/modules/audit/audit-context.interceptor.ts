import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditStorage } from './audit.context.js';

function cleanIp(ip: unknown): string | undefined {
  if (!ip) return undefined;
  return String(ip).split(',')[0].trim();
}

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const ip = cleanIp(
      req.ip ??
        req.headers?.['x-forwarded-for'] ??
        req.socket?.remoteAddress ??
        null,
    );
    const userAgent = req.headers?.['user-agent'] ?? null;
    return auditStorage.run({ ip, userAgent: userAgent ?? undefined }, () =>
      next.handle(),
    );
  }
}
