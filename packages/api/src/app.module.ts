import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
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
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { SolverGroupsModule } from './modules/solver-groups/solver-groups.module.js';
import { RoutingRulesModule } from './modules/routing-rules/routing-rules.module.js';
import { SlaModule } from './modules/sla/sla.module.js';
import { SequenceModule } from './modules/sequence/sequence.module.js';
import { TicketsModule } from './modules/tickets/tickets.module.js';
import { ApprovalFlowsModule } from './modules/approval-flows/approval-flows.module.js';
import { ApprovalsModule } from './modules/approvals/approvals.module.js';
import { ProblemsModule } from './modules/problems/problems.module.js';
import { ChangesModule } from './modules/changes/changes.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuditContextInterceptor } from './modules/audit/audit-context.interceptor.js';
import { KnowledgeModule } from './modules/knowledge/knowledge.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { FallbackModule } from './common/modules/fallback/fallback.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    SolverGroupsModule,
    RoutingRulesModule,
    SlaModule,
    SequenceModule,
    TicketsModule,
    ApprovalFlowsModule,
    ApprovalsModule,
    ProblemsModule,
    ChangesModule,
    AuditModule,
    KnowledgeModule,
    RealtimeModule,
    DashboardModule,
    CategoriesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, databaseConfig],
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
    FallbackModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
})
export class AppModule {}
