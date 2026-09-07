import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  AcceptLanguageResolver,
  I18nJsonLoader,
  I18nModule,
  I18nValidationPipe,
  QueryResolver,
} from 'nestjs-i18n';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 30,
      },
    ]),
    I18nModule.forRoot({
      fallbackLanguage: 'pt-BR',
      fallbacks: {
        'en-*': 'en',
        'es-*': 'es',
      },
      loaders: [
        new I18nJsonLoader({
          path: join(__dirname, '/i18n/'),
          includeSubfolders: true,
        }),
      ],
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new I18nValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}