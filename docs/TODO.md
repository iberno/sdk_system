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
- [ ] Criar commit inicial  → aguardando autorização do usuário

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
- [ ] Criar `src/config/app.config.ts`
- [ ] Criar `src/config/database.config.ts`
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
- [ ] Criar `prisma/seed.ts`
  - [ ] Seed: Empresas (3)
  - [ ] Seed: Grupos Solucionadores (N1, N2, N3, REDES, INFRA, DEVOPS) - cada um com min. 1 agente
  - [ ] Seed: Usuários (Admin, Manager, Agent ×4, User ×3) - agentes vinculados aos grupos
  - [ ] Seed: Routing Rules exemplo (TO_GROUP N1, ROUND_ROBIN N1, LEAST_LOADED INFRA)
  - [ ] Seed: Sequências iniciais (SequenceCounter: TICKET/ano atual = 0)
  - [ ] Seed: Tickets de exemplo (10+)
  - [ ] Seed: Políticas SLA
  - [ ] Seed: Artigos Knowledge Base
  - [ ] Seed: Approval Flows exemplo
  - [ ] Hash de senha com bcryptjs
- [ ] Configurar `prisma` no `package.json` para seed
- [ ] Rodar e validar seed

**Referência:** docs/ERD.md, docs/FLUXOS.md (seção 0)

---

## FASE 3 - Backend: Autenticação e Autorização

### 3.1 Módulo Auth

- [ ] Instalar: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
- [ ] Instalar: `bcryptjs`, `class-validator`, `class-transformer`
- [ ] Criar `src/modules/auth/auth.module.ts`
- [ ] Criar `src/modules/auth/auth.controller.ts`
- [ ] Criar `src/modules/auth/auth.service.ts`
- [ ] Criar `src/modules/auth/strategies/jwt.strategy.ts`
- [ ] Criar `src/modules/auth/strategies/local.strategy.ts`
- [ ] Criar DTOs: `login.dto.ts`
- [ ] Endpoint `POST /api/auth/login`
- [ ] Endpoint `POST /api/auth/refresh`
- [ ] Endpoint `POST /api/auth/logout`

### 3.2 Guards e Decorators

- [ ] Criar `src/common/guards/jwt-auth.guard.ts`
- [ ] Criar `src/common/guards/roles.guard.ts`
- [ ] Criar `src/common/decorators/roles.decorator.ts`
- [ ] Criar `src/common/decorators/current-user.decorator.ts`
- [ ] Aplicar guard global para proteger todos os endpoints

### 3.3 Autorização Dinâmica

- [ ] Criar serviço de permissões dinâmicas (consulta a DB)
- [ ] Implementar role base (ADMIN, MANAGER, AGENT, USER)
- [ ] Implementar permissões por SolverGroup
- [ ] Implementar permissões por ApprovalFlow
- [ ] Criar `PermissionService` injectável nos módulos

**Referência:** ADR-003, ADR-005

---

## FASE 4 - Backend: Módulos Core

### 4.1 Módulo Users

- [ ] CRUD completo: listar, criar, detalhes, atualizar
- [ ] Filtros por: role, company, solverGroup, status, search
- [ ] Paginação
- [ ] Alteração de status (soft disable)
- [ ] Proteção: apenas ADMIN altera role/solverGroup

### 4.2 Módulo Companies

- [ ] CRUD completo
- [ ] Soft delete (status = INACTIVE)
- [ ] Validação de CNPJ

### 4.3 Módulo SolverGroups

- [ ] CRUD completo
- [ ] Níveis: N1, N2, N3, N4, REDES, INFRA, DEVOPS, DATABASE, SECURITY
- [ ] Contagem de agentes e tickets abertos
- [ ] **Validação: mínimo 1 agente** por grupo (criação/edição)
- [ ] **PUT /solver-groups/:id/agents** (substituição da lista de agentes)
- [ ] Agente pertence a 1 grupo apenas (validação de unicidade)
- [ ] Grupo inativo não recebe tickets (guard no roteamento)

### 4.4 Módulo RoutingRules

- [ ] CRUD completo de regras de roteamento
- [ ] `POST /routing-rules` com validação de estratégia + grupo alvo
- [ ] Estratégias: TO_GROUP, ROUND_ROBIN, LEAST_LOADED, MANUAL
- [ ] Ordenação: `POST /routing-rules/reorder`
- [ ] Avaliação na criação do ticket (tipo + prioridade + categoria)
- [ ] ROUND_ROBIN: ponteiro de próximo agente + contador por grupo
- [ ] LEAST_LOADED: seleção do agente com menos tickets abertos (ACTIVE)
- [ ] Fallback: grupo padrão da empresa quando nenhuma regra casa

### 4.5 Módulo SLA

- [ ] CRUD de SLAPolicy
- [ ] Matriz SLA: tipo + prioridade → tempos
- [ ] Serviço de cálculo: `calculateSla(type, priority)`
- [ ] Atualização automática de `slaResponseAt` e `slaResolveAt`

**Referência:** docs/API.md (seções Users, Companies, SolverGroups, RoutingRules, SLA), docs/FLUXOS.md (seção 0)

---

## FASE 5 - Backend: Tickets

### 5.1 CRUD Básico

- [ ] `GET /tickets` com filtros avançados (inclui requesterId, beneficiaryId e ticketNumber)
- [ ] `POST /tickets` criação (auto: requester, company, status, SLA; beneficiary ← requester se omitido)
- [ ] **Gerar `ticketNumber`** atomicamente (SequenceCounter: `SD-{ano}-{000001}`)
- [ ] Serviço `SequenceService` reutilizável (TICKET, CHANGE, PROBLEM)
- [ ] `GET /tickets/:id` detalhe com personas (solicitante/beneficiário/aprovadores) + timeline, comments, history
- [ ] `PUT /tickets/:id` atualização
- [ ] Transições de status validadas (state machine)

### 5.2 Comentários

- [ ] `POST /tickets/:id/comments` com `visibility: PUBLIC | INTERNAL`
- [ ] `INTERNAL` apenas para equipe criar (AGENT/MANAGER/ADMIN ou grupo solucionador)
- [ ] **Filtro por participação:** solicitante/beneficiário/aprovadores NUNCA recebem `INTERNAL` (ADR-007)
- [ ] Proteção vale por participação no ticket, não por role
- [ ] Mesmo filtro aplicado no Socket.IO (evento `ticket.commented`)

### 5.3 Atribuição e Direcionamento

- [ ] `POST /tickets/:id/assign` (agente + grupo, mínimo 1 destino)
- [ ] Validação de coerência: agente deve pertencer ao grupo (422)
- [ ] Validação: grupo e agente ACTIVE
- [ ] `POST /tickets/:id/pickup` (agente assume ticket da fila do grupo)
- [ ] `GET /tickets/unassigned` (fila de pickup filtrada pelo grupo do usuário)
- [ ] `POST /tickets/reassign` (batch, MANAGER/ADMIN)
- [ ] Registro de `routedBy` (auto/estrategia/regra) no ticket
- [ ] Auto-atribuição na criação via RoutingRule
- [ ] Escala: regra de nível crescente (N1 → N2 → N3)
- [ ] Notificação ao agente atribuído (Socket + Email)
- [ ] TicketHistory + AuditLog em toda atribuição

### 5.4 Histórico

- [ ] Registrar alterações em `TicketHistory`
- [ ] Unificar com Auditoria
- [ ] Timeline de eventos do ticket

### 5.5 Anexos

- [ ] Upload de arquivos (multer)
- [ ] Download/visualização
- [ ] Validação de tipo e tamanho

**Referência:** docs/FLUXOS.md (Fluxo 1 e 2)

---

## FASE 6 - Backend: Aprovações

### 6.1 ApprovalFlow

- [ ] CRUD de fluxos de aprovação
- [ ] Regras em JSON: etapas, ordem, aprovador por role/grupo
- [ ] Validação de entidade vinculada (Ticket ou Change)

### 6.2 Aprovações

- [ ] `GET /approvals` (minhas aprovações)
- [ ] `POST /approvals/:id/approve`
- [ ] `POST /approvals/:id/reject`
- [ ] Ordenação por etapas (order)
- [ ] Bloqueio de etapa seguinte até aprovação anterior
- [ ] Retomada do fluxo ao aprovar/rejeitar

### 6.3 Integração

- [ ] Ticket muda para `WAITING_APPROVAL` quando precisa de aprovação
- [ ] Change muda para `PENDING_APPROVAL`
- [ ] Notificação ao aprovador
- [ ] Atualização em tempo real via Socket.IO

**Referência:** docs/FLUXOS.md (Fluxo 5)

---

## FASE 7 - Backend: Problemas e Mudanças

### 7.1 Módulo Problems

- [ ] CRUD de problemas
- [ ] Vínculo M:N com tickets (`ProblemTicket`)
- [ ] Campos: causa raiz, workaround, solução
- [ ] Análise de incidentes recorrentes (agrupamento)

### 7.2 Módulo Changes

- [ ] CRUD de mudanças
- [ ] Classificação: STANDARD, NORMAL, EMERGENCY
- [ ] Campos: plano, rollback, risco, agendamento
- [ ] Integração com aprovações
- [ ] Ações: submit, execute, rollback
- [ ] Transições de estado completas (state machine)

### 7.3 Vínculo

- [ ] Problem → Change (proposta de mudança)
- [ ] Change → Ticket (execução afeta tickets)
- [ ] Knowledge Article a partir de Problema resolvido

**Referência:** docs/FLUXOS.md (Fluxo 3 e 4)

---

## FASE 8 - Backend: Base de Conhecimento e Auditoria

### 8.1 Knowledge Base

- [ ] CRUD de artigos
- [ ] Publicação: rascunho → publicado
- [ ] Categorias e tags
- [ ] Busca por texto

### 8.2 Auditoria

- [ ] `AuditLog` integrado aos módulos existentes
- [ ] Registro: action, entity, entityId, oldData, newData
- [ ] Captura: userId, IP, userAgent
- [ ] `GET /audit` com filtros
- [ ] Associação a Login/Logout

**Referência:** docs/FLUXOS.md (Fluxo 7), docs/API.md

---

## FASE 9 - Backend: Realtime e Dashboard

### 9.1 Socket.IO

- [ ] Instalar `@nestjs/websockets` + `@nestjs/platform-socket.io`
- [ ] Gateway para tickets (rooms por company)
- [ ] Evento `ticket.created`
- [ ] Evento `ticket.updated`
- [ ] Evento `ticket.commented`
- [ ] Evento `approval.pending`
- [ ] Evento `sla.breached`
- [ ] Autenticação via JWT no socket
- [ ] Rooms: `company:{id}`, `user:{id}`, `group:{id}`

### 9.2 Dashboard

- [ ] `GET /dashboard/summary`
- [ ] KPI: abertos, em progresso, resolvidos, SLA breach
- [ ] Por prioridade, status, tipo, grupo
- [ ] Tendência diária (últimos 30 dias)
- [ ] Média de primeiro atendimento e resolução

**Referência:** docs/API.md (Dashboard)

---

## FASE 10 - Backend: Testes

### 10.1 Unit Tests

- [ ] Testes para `AuthService`
- [ ] Testes para `TicketService`
- [ ] Testes para `SLAService`
- [ ] Testes para `ApprovalService`
- [ ] Testes para guards e decorators

### 10.2 E2E Tests

- [ ] Fluxo de autenticação
- [ ] CRUD de tickets
- [ ] Fluxo de aprovação completo
- [ ] Escala de grupos solucionadores

---

## FASE 11 - Frontend: Setup

### 11.1 Scaffolding

- [ ] Criar `packages/web` com Vite + React + TypeScript
- [ ] Instalar: tailwindcss v4, postcss, autoprefixer
- [ ] Instalar: react-router-dom, @tanstack/react-query, zustand
- [ ] Instalar: axios, socket.io-client, lucide-react
- [ ] **i18n:** instalar i18next, react-i18next
- [ ] **i18n:** bundles `src/i18n/{pt-BR,en,es}` (UI + nomes de status/prioridade)
- [ ] **i18n:** provider `I18nextProvider` + persistência localStorage
- [ ] **i18n:** seletor de idioma no Header + sync com `User.locale`
- [ ] Configurar `vite.config.ts` (proxy para API)
- [ ] Configurar `tailwind.config.ts`
- [ ] Configurar TypeScript paths

### 11.2 Estrutura Base (padrão TailAdmin)

- [ ] Criar layout: `Sidebar + Header + MainContent`
- [ ] Sidebar colapsável
- [ ] Dark/Light mode
- [ ] Página de Loading (splash)
- [ ] Página de Erro

### 11.3 Design System - Componentes Globais

- [ ] `Button` (variants: primary, secondary, danger, ghost)
- [ ] `Card`
- [ ] `Badge` (variants: status colors)
- [ ] `Input`, `Select`, `Textarea`
- [ ] `Table` (com paginação, sorting)
- [ ] `Modal`
- [ ] `Dropdown`
- [ ] `Toast` (notificações)
- [ ] `ConfirmDialog`
- [ ] `EmptyState`
- [ ] `Skeleton`
- [ ] `Tabs`
- [ ] `Avatar`
- [ ] `FormField` (label + erro + input)

**Referência:** ADR-010

---

## FASE 12 - Frontend: Auth

- [ ] Página de Login
- [ ] Página de Esqueci minha senha
- [ ] Store `authStore` (Zustand): token, user, refresh logic
- [ ] Axios interceptor: attach token + 401 refresh retry
- [ ] Socket.IO com auth (JWT)
- [ ] Route guard: proteger rotas privadas
- [ ] Persistência de sessão (localStorage)
- [ ] Redirect baseado em role (ADMIN → /login → /dashboard)

---

## FASE 13 - Frontend: Dashboard

- [ ] Cards de KPI (abertos, em progresso, resolvidos, SLA)
- [ ] Gráfico de tendência (últimos 30 dias)
- [ ] Distribuição por prioridade (pie)
- [ ] Distribuição por status (bar)
- [ ] Distribuição por grupo (bar)
- [ ] Lista de tickets recentes
- [ ] Alertas SLA breach
- [ ] Responsivo

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