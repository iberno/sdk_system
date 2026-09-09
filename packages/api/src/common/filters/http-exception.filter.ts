import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { Response } from 'express';
import { I18nValidationException } from 'nestjs-i18n';

const DEFAULT_ERROR_KEY = 'errors.internal';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const i18n = I18nContext.current();

    if (exception instanceof I18nValidationException) {
      const status = HttpStatus.BAD_REQUEST;
      const errors = exception.errors;
      const first = errors[0]?.constraints;
      const key = first ? Object.values(first)[0] : DEFAULT_ERROR_KEY;

      void response.status(status).json({
        statusCode: status,
        status: 'BAD_REQUEST',
        error: 'ValidationError',
        i18n: { key, args: { property: errors[0]?.property } },
        message: i18n
          ? i18n.t(key, { args: { property: errors[0]?.property } })
          : undefined,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      let key = DEFAULT_ERROR_KEY;
      let args: Record<string, unknown> | undefined;
      if (typeof body === 'object' && body !== null && 'key' in body) {
        key = (body as { key: string }).key;
      }
      if (typeof body === 'object' && body !== null && 'args' in body) {
        args = (body as { args?: Record<string, unknown> }).args;
      }

      void response.status(status).json({
        statusCode: status,
        status: HttpStatus[status],
        error:
          typeof body === 'object' && body !== null && 'error' in body
            ? (body as { error: string }).error
            : exception.name,
        i18n: { key, ...(args ? { args } : {}) },
        message: i18n ? i18n.t(key, { args }) : undefined,
      });
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    void response.status(status).json({
      statusCode: status,
      status: 'INTERNAL_SERVER_ERROR',
      error: 'InternalServerError',
      i18n: { key: DEFAULT_ERROR_KEY },
      message: i18n ? i18n.t(DEFAULT_ERROR_KEY) : undefined,
    });
  }
}
