import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const statusCode = context.switchToHttp().getResponse().statusCode;
        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'pagination' in data
        ) {
          const { items, pagination } = data as PaginatedResult<unknown>;
          return {
            statusCode,
            message: 'success',
            data: items as T,
            pagination,
          };
        }
        return { statusCode, message: 'success', data };
      }),
    );
  }
}