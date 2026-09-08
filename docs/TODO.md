# TODO de Implementação - Service Desk ITIL v4

## Como usar este documento

Cada item tem um checkbox. Complete em ordem. Itens marcados com **`[ ]`**
são pendentes. **`[x]`** são concluídos.

**Fases:**
- 🏗️ **Estrutura** - Setup do projeto
- 📦 **Backend** - API NestJS
- 🎨 **Frontend** - React + TailAdmin pattern
- 🔗 **Integração** - Conexão entre as partes

---

## FASE 0 - Configuração do Ambiente

### 0.1 Verificar pré-requisitos

- [x] Node.js v24 instalado (`node --version`)  → v26.8.1
- [x] pnpm instalado (`pnpm --version`)  → v11.24.0
- [x] PostgreSQL v18 rodando (`pg_isready`)  → v17.11 (compatível com Prisma)
- [x] Banco `servicedesk` criado no PostgreSQL
- [x] Usuário/credenciais PostgreSQL definidos  → role `servicedesk` + senha dev

### 0.2 Setup do Monorepo

- [x] Criar `package.json` raiz com pnpm workspaces
- [x] Criar `pnpm-workspace.yaml`
- [x] Criar `.gitignore` raiz
- [x] Criar `tsconfig.base.json` (config compartilhada)
- [x] Inicializar git (`git init`)
- [x] Criar commit inicial  → commits publicados ao longo das fases

**Referência:** ADR-001 (pnpm workspaces)

---

## FASE 1 - Backend: Setup NestJS

### 1.1 Scaffolding

- [x] Criar `packages/api` com `@nestjs/cli`  → NestJS 12 (ESM)
- [x] Instalar dependências base (NestJS core, common, platform-express)
- [x] Instalar dependências de apoio (typescript, ts-loader, etc.)
- [x] Configurar `nest-cli.json`  (+ assets i18n p/ dist)

### 1.2 Configuração

- [x] Instalar `@nestjs/config` e `dotenv`
- [x] Criar `.env` e `.env.example`
- [x] Criar `src/config/app.config.ts`  → Fase 11 (registerAs + ConfigModule.forRoot load; CORS/port via ConfigService)
- [x] Criar `src/config/database.config.ts`  → Fase 11 (registerAs; colocado no load do ConfigModule)
- [x] Configurar CORS para frontend (porta 5173)
- [x] Configurar global prefix `/api`
- [x] Configurar ValidationPipe global  → I18nValidationPipe
- [x] Configurar rate limiter (`@nestjs/throttler` - 30 req/60s)
- [x] **i18n:** instalar `nestjs-i18n` e configurar módulo (ADR-013)  → v11.0.0-beta (compatível Nest 12)
- [x] **i18n:** criar pastas `src/i18n/{pt-BR,en,es}` com `errors/validation/business`
- [x] **i18n:** `User.locale` + resolução `Accept-Language → ?lang → User.locale → pt-BR`  (User.locale no schema; resolvers prontos)
- [x] **i18n:** erro padronizado com `i18n.key` + `args` + `message` localizado

### 1.3 Swagger

- [x] Instalar `@nestjs/swagger`  → v12.0.1 (necessário para Nest 12)
- [x] Configurar Swagger em `main.ts`
- [x] Acessível em `/swagger`

### 1.4 Middleware e Interceptors

- [x] Criar `src/common/filters/http-exception.filter.ts`
- [x] Criar `src/common/interceptors/transform.interceptor.ts`
- [x] Registrar globalmente no `main.ts`

---

## FASE 2 - Backend: Banco de Dados (Prisma)

### 2.1 Prisma Setup

- [x] Instalar `prisma` e `@prisma/client`  → v6.19.3
- [x] Criar `prisma/schema.prisma` baseado no **ERD.md**  (20 models + 16 enums)
- [x] Configurar `DATABASE_URL` no `.env`
- [x] Rodar `prisma generate`

### 2.2 Models (ordem de criação)

- [x] Enum → `Role`, `Status`, `GroupLevel`
- [x] Enum → `TicketType`, `TicketStatus`, `Priority`, `Impact`, `Urgency`
- [x] Enum → `ProblemStatus`
- [x] Enum → `ChangeType`, `ChangeStatus`, `Risk`
- [x] Enum → `ApprovalStatus`
- [x] Enum → `CommentVisibility` (PUBLIC, INTERNAL)
- [x] Model `User` (role, status, locale)
- [x] Model `Company`
- [x] Model `SolverGroup`
- [x] Model `Ticket` (requesterId + beneficiaryId + ticketNumber)
- [x] Model `TicketComment` (visibility)
- [x] Model `SequenceCounter` (numeração atômica por ano)
- [x] Model `TicketHistory`
- [x] Model `Attachment`
- [x] Model `Problem` (+ `ProblemTicket` relação M:N)
- [x] Model `Change` (+ `ChangeTicket` relação M:N)
- [x] Model `Approval`
- [x] Model `ApprovalFlow`
- [x] Model `RoutingRule` (auto-atribuição)
- [x] Enum → `RoutingStrategy` (TO_GROUP, ROUND_ROBIN, LEAST_LOADED, MANUAL)
- [x] Model `SLAPolicy`
- [x] Model `KnowledgeArticle`
- [x] Model `AuditLog`
- [x] Model `RefreshToken`

### 2.3 Migrations e Seed

- [x] Rodar `prisma migrate dev` (primeira migration)  → `20260907223317_init` aplicada
- [x] Criar `prisma/seed.ts`
  - [x] Seed: Empresas (3)
  - [x] Seed: Grupos Solucionadores (N1, N2, N3, REDES, INFRA, DEVOPS) - cada um com min. 1 agente
  - [x] Seed: Usuários (Admin, Manager, Agent ×6, User ×3) - agentes vinculados aos grupos
  - [x] Seed: Routing Rules exemplo (TO_GROUP N1, ROUND_ROBIN N1, LEAST_LOADED INFRA)
  - [x] Seed: Sequências iniciais (SequenceCounter: TICKET/ano atual = 12, alinhado aos 12 tickets semeados — se usar 0, o próximo ticket colidiria no UNIQUE)
  - [x] Seed: Tickets de exemplo (12)
  - [x] Seed: Políticas SLA
  - [x] Seed: Artigos Knowledge Base
  - [x] Seed: Approval Flows exemplo
  - [x] Hash de senha com bcryptjs
- [x] Configurar `prisma` no `package.json` para seed
- [x] Rodar e validar seed (idempotente, 6/6 grupos com agente)

**Referência:** docs/ERD.md, docs/FLUXOS.md (seção 0)

---

## FASE 3 - Backend: Autenticação e Autorização

### 3.1 Módulo Auth

- [x] Instalar: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` (+ `passport-local`, `@types/passport-local`)
- [x] Instalar: `bcryptjs`, `class-validator`, `class-transformer`
- [x] Criar `src/modules/auth/auth.module.ts`
- [x] Criar `src/modules/auth/auth.controller.ts`
- [x] Criar `src/modules/auth/auth.service.ts`
- [x] Criar `src/modules/auth/strategies/jwt.strategy.ts`
- [x] Criar `src/modules/auth/strategies/local.strategy.ts`
- [x] Criar DTOs: `login.dto.ts` (+ refresh/logout)
- [x] Endpoint `POST /api/auth/login`
- [x] Endpoint `POST /api/auth/refresh` (rotação de refresh token)
- [x] Endpoint `POST /api/auth/logout` (revoga refresh token)

### 3.2 Guards e Decorators

- [x] Criar `src/common/guards/jwt-auth.guard.ts`
- [x] Criar `src/common/guards/roles.guard.ts`
- [x] Criar `src/common/decorators/roles.decorator.ts`
- [x] Criar `src/common/decorators/current-user.decorator.ts`
- [x] Aplicar guard global para proteger todos os endpoints (JwtAuthGuard + RolesGuard globais; `@Public()` para exceções)
- [x] Refactor: catch-all 404 movido para `FallbackModule` importado por último (rota `@All('*')` no AppController engolia `/auth/login`)

### 3.3 Autorização Dinâmica

- [x] Criar serviço de permissões dinâmicas (consulta a DB) — `src/modules/permissions/permission.service.ts`
- [x] Implementar role base (ADMIN, MANAGER, AGENT, USER)
- [x] Implementar permissões por SolverGroup
- [x] Implementar permissões por ApprovalFlow
- [x] Criar `PermissionService` injectável nos módulos (módulo global)
- [x] Módulo Prisma global (`PrismaService`)

**Referência:** ADR-003, ADR-005

---

## FASE 4 - Backend: Módulos Core

### 4.1 Módulo Users

- [x] CRUD completo: listar, criar, detalhes, atualizar
- [x] Filtros por: role, company, solverGroup, status, search
- [x] Paginação
- [x] Alteração de status (soft disable)
- [x] Proteção: apenas ADMIN altera role/solverGroup

### 4.2 Módulo Companies

- [x] CRUD completo
- [x] Soft delete (status = INACTIVE)
- [x] Validação de CNPJ

### 4.3 Módulo SolverGroups

- [x] CRUD completo
- [x] Níveis: N1, N2, N3, N4, REDES, INFRA, DEVOPS, DATABASE, SECURITY
- [x] Contagem de agentes e tickets abertos
- [x] **Validação: mínimo 1 agente** por grupo (criação/edição)
- [x] **PUT /solver-groups/:id/agents** (substituição da lista de agentes)
- [x] Agente pertence a 1 grupo apenas (validação de unicidade)
- [x] Grupo inativo não recebe tickets (guard no roteamento)

### 4.4 Módulo RoutingRules

- [x] CRUD completo de regras de roteamento
- [x] `POST /routing-rules` com validação de estratégia + grupo alvo
- [x] Estratégias: TO_GROUP, ROUND_ROBIN, LEAST_LOADED, MANUAL
- [x] Ordenação: `POST /routing-rules/reorder`
- [x] Avaliação na criação do ticket (tipo + prioridade + categoria) — aplicada na Fase 5
- [x] ROUND_ROBIN: ponteiro de próximo agente + contador por grupo
- [x] LEAST_LOADED: seleção do agente com menos tickets abertos (ACTIVE)
- [x] Fallback: grupo padrão da empresa quando nenhuma regra casa

### 4.5 Módulo SLA

- [x] CRUD de SLAPolicy
- [x] Matriz SLA: tipo + prioridade → tempos
- [x] Serviço de cálculo: `calculateSla(type, priority)`
- [x] Atualização automática de `slaResponseAt` e `slaResolveAt` — aplicada na Fase 5 (criação de ticket)

**Referência:** docs/API.md (seções Users, Companies, SolverGroups, RoutingRules, SLA), docs/FLUXOS.md (seção 0)

---

## FASE 5 - Backend: Tickets

### 5.1 CRUD Básico

- [x] `GET /tickets` com filtros avançados (inclui requesterId, beneficiaryId e ticketNumber)
- [x] `POST /tickets` criação (auto: requester, company, status, SLA; beneficiary ← requester se omitido)
- [x] **Gerar `ticketNumber`** atomicamente (SequenceCounter: `SD-{ano}-{000001}`)
- [x] Serviço `SequenceService` reutilizável (TICKET, CHANGE, PROBLEM)
- [x] `GET /tickets/:id` detalhe com personas (solicitante/beneficiário/aprovadores) + timeline, comments, history
- [x] `PUT /tickets/:id` atualização
- [x] Transições de status validadas (state machine)

### 5.2 Comentários

- [x] `POST /tickets/:id/comments` com `visibility: PUBLIC | INTERNAL`
- [x] `INTERNAL` apenas para equipe criar (AGENT/MANAGER/ADMIN ou grupo solucionador)
- [x] **Filtro por participação:** solicitante/beneficiário/aprovadores NUNCA recebem `INTERNAL` (ADR-007)
- [x] Proteção vale por participação no ticket, não por role
- [x] Mesmo filtro aplicado no Socket.IO (evento `ticket.commented`) — Fase 11: `INTERNAL` emitido só para sockets não-USER e não-participantes (`exceptUserIds` no payload + `fetchSockets`)

### 5.3 Atribuição e Direcionamento

- [x] `POST /tickets/:id/assign` (agente + grupo, mínimo 1 destino)
- [x] Validação de coerência: agente deve pertencer ao grupo (422)
- [x] Validação: grupo e agente ACTIVE
- [x] `POST /tickets/:id/pickup` (agente assume ticket da fila do grupo)
- [x] `GET /tickets/unassigned` (fila de pickup filtrada pelo grupo do usuário)
- [x] `POST /tickets/reassign` (batch, MANAGER/ADMIN)
- [x] Registro de `routedBy` (auto/estrategia/regra) no ticket
- [x] Auto-atribuição na criação via RoutingRule
- [x] Escala: regra de nível crescente (N1 → N2 → N3) — AGENT só escala p/ nível ≥; MANAGER/ADMIN livres
- [x] Notificação ao agente atribuído (Socket) — Fase 11: evento `ticket.assigned` para room `user:{assigneeId}` em `applyAssignment`; Email fica para o Frontend/notificações (sem infra de SMTP no backend)
- [x] TicketHistory em toda atribuição (AuditLog dedicado na Fase 8)

### 5.4 Histórico

- [x] Registrar alterações em `TicketHistory`
- [x] Unificar com Auditoria — integração AuditLog na Fase 8
- [x] Timeline de eventos do ticket

### 5.5 Anexos

- [x] Upload de arquivos (multer)
- [x] Download/visualização
- [x] Validação de tipo e tamanho (máx 10MB, whitelist MIME)

**Referência:** docs/FLUXOS.md (Fluxo 1 e 2)

---

## FASE 6 - Backend: Aprovações

### 6.1 ApprovalFlow

- [x] CRUD de fluxos de aprovação
- [x] Regras em JSON: etapas, ordem, aprovador por role/grupo (`{stages:[{order, approverRole|solverGroupId|userId}]}`)
- [x] Validação de entidade vinculada (TICKET hoje; CHANGE será acionado na Fase 7)

### 6.2 Aprovações

- [x] `GET /approvals` (minhas aprovações, filtro por status)
- [x] `POST /approvals/:id/approve`
- [x] `POST /approvals/:id/reject`
- [x] Ordenação por etapas (order)
- [x] Bloqueio de etapa seguinte até aprovação anterior (422 se etapa anterior pendente)
- [x] Retomada do fluxo ao aprovar/rejeitar (restaura status anterior + auto-assign)

### 6.3 Integração

- [x] Ticket muda para `WAITING_APPROVAL` quando precisa de aprovação (`POST /tickets/:id/request-approval`, MANAGER/AGENT/ADMIN)
- [x] Change muda para `PENDING_APPROVAL` — Fase 7 (`requestForChange`) / Fase 9 (emit `approval.pending`)
- [x] Notificação ao aprovador — Fase 9 (Realtime): `approval.pending` para room `user:{approverId}`
- [x] Atualização em tempo real via Socket.IO — Fase 9 (Realtime)

**Referência:** docs/FLUXOS.md (Fluxo 5)

---

## FASE 7 - Backend: Problemas e Mudanças

### 7.1 Módulo Problems

- [x] CRUD de problemas
- [x] Vínculo M:N com tickets (`ProblemTicket`)
- [x] Campos: causa raiz, workaround, solução
- [x] Análise de incidentes recorrentes (agrupamento)

### 7.2 Módulo Changes

- [x] CRUD de mudanças
- [x] Classificação: STANDARD, NORMAL, EMERGENCY
- [x] Campos: plano, rollback, risco, agendamento
- [x] Integração com aprovações
- [x] Ações: submit, execute, rollback
- [x] Transições de estado completas (state machine)

### 7.3 Vínculo

- [x] Problem → Change (proposta de mudança)
- [x] Change → Ticket (execução afeta tickets)
- [x] Knowledge Article a partir de Problema resolvido (implementado na Fase 8)

**Referência:** docs/FLUXOS.md (Fluxo 3 e 4)

> **Notas Fase 7:** rota adicional `POST /changes/:id/complete` para fechar a transição
> `IN_PROGRESS -> COMPLETED` (o contrato original só previa submit/execute/rollback); rota
> `POST /problems/:id/propose-change` para o vínculo Problem → Change; Knowledge Article
> adiado para a Fase 8 (requer o módulo `knowledge`).

---

## FASE 8 - Backend: Base de Conhecimento e Auditoria

### 8.1 Knowledge Base

- [x] CRUD de artigos
- [x] Publicação: rascunho → publicado
- [x] Categorias e tags
- [x] Busca por texto
- [x] Artigo gerado de problema resolvido (`POST /problems/:id/publish-article`)

### 8.2 Auditoria

- [x] `AuditLog` integrado aos módulos existentes
- [x] Registro: action, entity, entityId, oldData, newData
- [x] Captura: userId, IP, userAgent
- [x] `GET /audit` com filtros
- [x] Associação a Login/Logout

**Referência:** docs/FLUXOS.md (Fluxo 7), docs/API.md

---

## FASE 9 - Backend: Realtime e Dashboard

### 9.1 Socket.IO

- [x] Instalar `@nestjs/websockets` + `@nestjs/platform-socket.io`
- [x] Gateway para tickets (rooms por company)
- [x] Evento `ticket.created`
- [x] Evento `ticket.updated`
- [x] Evento `ticket.commented`
- [x] Evento `approval.pending`
- [x] Evento `sla.breached`
- [x] Autenticação via JWT no socket
- [x] Rooms: `company:{id}`, `user:{id}`, `group:{id}`

### 9.2 Dashboard

- [x] `GET /dashboard/summary`
- [x] KPI: abertos, em progresso, resolvidos, SLA breach
- [x] Por prioridade, status, tipo, grupo
- [x] Tendência diária (últimos 30 dias)
- [x] Média de primeiro atendimento e resolução

**Referência:** docs/API.md (Dashboard)

---

## FASE 10 - Backend: Testes

### 10.1 Unit Tests

- [x] Testes para `AuthService`
- [x] Testes para `TicketService`
- [x] Testes para `SLAService`
- [x] Testes para `ApprovalService`
- [x] Testes para guards e decorators

### 10.2 E2E Tests

- [x] Fluxo de autenticação
- [x] CRUD de tickets
- [x] Fluxo de aprovação completo
- [x] Escala de grupos solucionadores

---

## FASE 11 - Frontend: Setup

### 11.1 Scaffolding

- [x] Criar `packages/web` com Vite + React + TypeScript  → Vite 8, React 19, TS 6
- [x] Instalar: tailwindcss v4 (+ plugin oficial `@tailwindcss/vite`; `postcss/autoprefixer` dispensáveis na v4)
- [x] Instalar: react-router-dom, @tanstack/react-query, zustand
- [x] Instalar: axios, socket.io-client, lucide-react
- [x] **i18n:** instalar i18next, react-i18next
- [x] **i18n:** bundles `src/i18n/{pt-BR,en,es}` (UI + nomes de status/prioridade)
- [x] **i18n:** provider `I18nextProvider` + persistência localStorage
- [x] **i18n:** seletor de idioma no Header + sync com `User.locale`
- [x] Configurar `vite.config.ts` (proxy para API + socket.io via ws)
- [x] Configurar `tailwind.config.ts` (v4, carregado via `@config`)
- [x] Configurar TypeScript paths (`@/*`)

### 11.2 Estrutura Base (padrão TailAdmin)

- [x] Criar layout: `Sidebar + Header + MainContent`
- [x] Sidebar colapsável
- [x] Dark/Light mode (classe `.dark`, persistido)
- [x] Página de Loading (splash)
- [x] Página de Erro

### 11.3 Design System - Componentes Globais

- [x] `Button` (variants: primary, secondary, danger, ghost)
- [x] `Card`
- [x] `Badge` (variants: status colors)
- [x] `Input`, `Select`, `Textarea`
- [x] `SearchableSelect` (busca com teclado, filtro sem acento, clearable)  ← adicionado a pedido
- [x] `Table` (com paginação, sorting)
- [x] `Modal`
- [x] `Dropdown`
- [x] `Toast` (notificações)
- [x] `ConfirmDialog`
- [x] `EmptyState`
- [x] `Skeleton`
- [x] `Tabs`
- [x] `Avatar`
- [x] `FormField` (label + erro + input)

**Referência:** ADR-010

---

## FASE 12 - Frontend: Auth

- [x] Página de Login (split-screen com imagem do Unsplash, atalhos de credenciais demo)
- [x] Página de Esqueci minha senha
- [x] Store `authStore` (Zustand): token, user, refresh logic (ação `login`)
- [x] Axios interceptor: attach token + 401 refresh retry
- [x] Socket.IO com auth (JWT) — `lib/socket.ts`, conecta no `AppLayout`
- [x] Route guard: proteger rotas privadas (`RequireAuth`/`GuestRoute`)
- [x] Persistência de sessão (localStorage)
- [x] Redirect baseado em role (login → `/`; preserva rota alvo via `state.from`)
- [x] Transições de página (direcional, forward/back, `prefers-reduced-motion`) — `PageTransition`

---

## FASE 13 - Frontend: Dashboard

Interligado ao backend (`GET /tickets` via React Query + axios com JWT) — dados reais do seed:

- [x] Cards de KPI (abertos, em progresso, resolvidos, SLA) — computados dos tickets reais
- [ ] Gráfico de tendência (últimos 30 dias)
- [ ] Distribuição por prioridade (pie) — atual: progress bars por severidade
- [x] Distribuição por status (bar)
- [ ] Distribuição por grupo (bar)
- [x] Lista de tickets recentes (8 recentes, sorting client-side)
- [x] Alertas SLA breach (chip no topo + KPI com contagem)
- [x] Responsivo
- [x] Estados de loading (skeleton), erro (retry) e vazio

---

## FASE 14 - Frontend: Tickets

### 14.1 Lista

- [ ] Tabela de tickets com paginação
- [ ] Filtros: status, tipo, prioridade, grupo, busca (título ou ticketNumber)
- [ ] Badge com número do ticket (SD-2026-000124)
- [ ] Sorting
- [ ] Badges de prioridade e status
- [ ] Link para detalhes

### 14.2 Criar

- [ ] Form com: título, descrição, tipo
- [ ] Solicitante automático (usuário logado) + campo Beneficiário (opcional, default = solicitante)
- [ ] Seleção de prioridade (default Medium)
- [ ] Upload de anexo (opcional)
- [ ] Preview SLA após salvar
- [ ] Preview do destino automático (grupo/agente) via RoutingRule

### 14.3 Detalhes

- [ ] Header: título, número, badges
- [ ] Personas visíveis: Solicitante, Beneficiário e Aprovadores (se houver)
- [ ] Timeline de eventos
- [ ] Comentários com seletor PUBLIC/INTERNAL (INTERNAL só para equipe, com aviso visual)
- [ ] Comentários INTERNAL ocultos para solicitante/beneficiário/aprovadores
- [ ] Histórico de mudanças
- [ ] Atribuição (agente + grupo) com validação de pertencimento
- [ ] Botão "Assumir" (pickup) para tickets na fila do MEU grupo
- [ ] Indicador de auto-atribuição (routedBy: regra + estratégia)
- [ ] Ações contextuais por role:
  - AGENT: assumir, resolver, comentar (PUBLIC/INTERNAL), escalar
  - MANAGER/ADMIN: atribuir a qualquer agente/grupo, tudo
  - USER: comentar (apenas PUBLIC), fechar
- [ ] Anexos (upload/visualizar)
- [ ] Links: problema, mudança, artigos KB

---

## FASE 15 - Frontend: Administração

### 15.1 Usuários

- [ ] Tabela de usuários + busca
- [ ] Form de criação/edição
- [ ] Alteração de role, grupo, empresa
- [ ] Ativar/desativar

### 15.2 Empresas

- [ ] CRUD completo

### 15.3 Grupos Solucionadores

- [ ] CRUD completo
- [ ] Gestão de membros (adicionar/remover agentes, mínimo 1)
- [ ] Visualização de membros e tickets

### 15.3b Routing Rules

- [ ] CRUD de regras de auto-atribuição
- [ ] Seleção de estratégia (TO_GROUP, ROUND_ROBIN, LEAST_LOADED, MANUAL)
- [ ] Seleção de grupo alvo (com contagem de agentes)
- [ ] Reordenação de regras (drag & drop)
- [ ] Toggle ativa/desativa

### 15.4 SLA

- [ ] CRUD de políticas
- [ ] Matriz visual

### 15.5 Approval Flows

- [ ] CRUD de fluxos
- [ ] Editor visual de etapas (drag & drop de aprovadores)

### 15.6 Base de Conhecimento

- [ ] Lista de artigos
- [ ] Criar/editar com preview
- [ ] Publicação

### 15.7 Auditoria

- [ ] Tabela de logs com filtros

---

## FASE 16 - Frontend: Realtime

- [ ] Hook `useRealtime()` global
- [ ] Toast quando novo ticket em rota da companhia
- [ ] Badge de notificações no header
- [ ] Invalidation do TanStack Query em eventos socket
- [ ] Atualização em tempo real nas listas de tickets

---

## FASE 17 - Integração completa

- [ ] Conectar todos os módulos frontend à API
- [ ] Verificar fluxos end-to-end:
  - [ ] Login → Dashboard
  - [ ] Criar ticket → roteado por RoutingRule → aparece no grupo/agente
  - [ ] Agente assume (pickup) ou é atribuído → resolve
  - [ ] Atribuição manual para agente fora do grupo → erro 422
  - [ ] Mudança → aprovação → execução
  - [ ] Problema → mudança → KB
- [ ] Testar todos os roles
- [ ] Testar operação em multiempresa (sem vazamento)
- [ ] Testar responsividade (mobile)
- [ ] Testar dark/light mode
- [ ] Performance: verificar queries lentas

---

## FASE 18 - Qualidade e Entrega

- [ ] ESLint + Prettier em toda a base
- [ ] Lint-staged + Husky pre-commit
- [ ] Roda testes unitários
- [ ] Rodar testes E2E
- [ ] Documentação atualizada (docs/)
- [ ] `.env.example` completo para nova dev
- [ ] README com instruções de setup
- [ ] Swagger exportado/validado
- [ ] Commit final com release notes

---

## Resumo por Fase

| Fase | Descrição | Itens |
|------|-----------|-------|
| 0 | Configuração do Ambiente | 7 |
| 1 | Backend: Setup NestJS | 16 |
| 2 | Backend: Banco + Prisma | 26 |
| 3 | Backend: Auth + Autorização | 18 |
| 4 | Backend: Módulos Core | 24 |
| 5 | Backend: Tickets | 22 |
| 6 | Backend: Aprovações | 11 |
| 7 | Backend: Problemas/Mudanças | 15 |
| 8 | Backend: KB + Auditoria | 8 |
| 9 | Backend: Realtime + Dashboard | 12 |
| 10 | Backend: Testes | 9 |
| 11 | Frontend: Setup | 27 |
| 12 | Frontend: Auth | 8 |
| 13 | Frontend: Dashboard | 8 |
| 14 | Frontend: Tickets | 16 |
| 15 | Frontend: Administração | 16 |
| 16 | Frontend: Realtime | 4 |
| 17 | Integração completa | 8 |
| 18 | Qualidade e Entrega | 9 |
| | **Total** | **264** |