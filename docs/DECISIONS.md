# Descisões de Arquitetura (ADRs)

Documento de decisões de arquitetura (ADRs) do projeto Service Desk ITIL v4.
Cada ADR documenta uma decisão importante, seu contexto e suas consequências.

---

## ADR-001: Monorepo com pnpm workspaces

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

O projeto possui dois pacotes independentes (API e Web) que compartilham contexto
de negócio e evoluem juntos. É necessário facilitar o desenvolvimento local,
versionamento conjunto e futura extração para microsserviços.

### Decisão

Utilizar um monorepo com **pnpm workspaces** com dois pacotes:

```
ServiceDesk/
├── packages/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend React
├── docs/             # Documentação
```

### Consequências

**Positivas:**

- Instalação de dependências mais rápida (pnpm)
- Versionamento conjunto de API + Frontend
- Fácil compartilhamento de tipos (futuro: `packages/shared`)

**Negativas:**

- Requer pnpm instalado globalmente
- Hoisting de dependências pode causar conflitos em casos específicos

---

## ADR-002: Feature-based Modules no NestJS

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

O backend crescerá para ~15 módulos. A estrutura layer-based (todas controllers,
todas services em pastas separadas) dificulta a navegação e manutenção.

### Decisão

Utilizar **estrutura feature-based** onde cada módulo contém seus controllers,
services, DTOs e entities:

```
src/modules/
├── auth/
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
```

### Consequências

**Positivas:**

- Coesão alta por módulo
- Mover/remover um módulo é remover uma pasta
- Cada feature é testável isoladamente

**Negativas:**

- Código compartilhado entre features precisa de atenção
- Módulos podem crescer descontroladamente sem disciplina

---

## ADR-003: Roles Dinâmicas (sem hardcode)

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

O negócio exige que papéis e permissões evoluam: novos grupos solucionadores,
novos perfis de aprovação, novos níveis hierárquicos. Roles fixas como enum
em código não atendem esse requisito.

### Decisão

**Sim, temos RBAC — mas como um modelo híbrido** (RBAC + ABAC leve + controle por
participação), com papéis dinâmicos em 3 camadas:

1. **Role base** (enum no código): `ADMIN`, `MANAGER`, `AGENT`, `USER`
2. **SolverGroup** (tabela): define capacidades do agente (`N1`, `N2`, `DEVOPS`, `INFRA`...)
3. **ApprovalFlow** (tabela): define quem pode aprovar, em que ordem

```sql
-- Permissão efetiva derivada de 3 fontes:
permissao = f(role_base, solver_group, approval_flows_vinculados)
```

**E ainda, controle por participação no objeto (ABAC/object-level):**

- Comentários `INTERNAL`: solicitante/beneficiário/aprovador **nunca** veem,
  independente da role (a proteção é por participação no ticket)
- Filtro de dados por `company_id` do usuário
- Capacidade de atender = pertence ao grupo solucionador do ticket

### Consequências

**Positivas:**

- Novos grupos/níveis criados pelo ADMIN sem deploy
- Permissões evoluem com o negócio
- Multi-tenant futuro simplificado (per empresa)
- Segurança por participação complementa o RBAC (defesa em camadas)

**Negativas:**

- Validação de permissão mais complexa (consulta a DB + contexto do objeto)
- Requer cache para performance (elasticache/redis futuro)

---

## ADR-004: Prisma ORM com migrations versionadas

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

É necessário um ORM type-safe, com migrations versionáveis e suporte nativo
a PostgreSQL.

### Decisão

Utilizar **Prisma ORM** com:

- `schema.prisma` como fonte de verdade do banco
- Migrations versionadas em `prisma/migrations/`
- Seed script para dados iniciais
- Prisma Client gerado tipado

### Consequências

**Positivas:**

- Typescript com full type safety
- Migrations reviewáveis
- Seed data reproduzível

**Negativas:**

- Vendor lock-in (Prisma)
- Migrations complexas (data migrations) requerem scripts extras

---

## ADR-005: Auth com Refresh Token Rotation

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

Segurança corporativa exige mitigação de roubo de tokens. Access tokens com
curta duração somados a refresh tokens rotacionáveis reduzem o risco.

### Decisão

Implementar **JWT com rotation**:

| Token   | Validade | Onde fica         | Rotation             |
| ------- | -------- | ----------------- | -------------------- |
| Access  | 15 min   | Memória (Zustand) | Re-gerado no refresh |
| Refresh | 7 dias   | HttpOnly cookie   | Novos a cada refresh |

### Consequências

**Positivas:**

- Menor janela de exposição do access token
- Refresh rotation invalida tokens roubados
- Logout funcional (revoga refresh no servidor)

**Negativas:**

- Estado no servidor (tabela refresh_tokens)
- Complexidade ligeiramente maior

---

## ADR-006: Estado do Frontend (Zustand + TanStack Query)

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

Divisão clara entre estado do servidor (dados da API) e estado do cliente
(UI state, sessão, preferências).

### Decisão

| Camada         | Responsabilidade                                         |
| -------------- | -------------------------------------------------------- |
| TanStack Query | Dados vindos da API (tickets, users, cache, invalidação) |
| Zustand        | Sessão/token, sidebar, tema, preferências                |

### Consequências

**Positivas:**

- Zero duplicação de fetch
- Cache inteligente com background refetch
- Stores pequenos e testáveis

**Negativas:**

- Duas libs de estado (curva de aprendizado)

---

## ADR-007: Visibilidade de Comentários (PUBLIC vs INTERNAL)

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

Agentes precisam discutir detalhes técnicos internos (diagnósticos, hipóteses,
links de infra) sem expor ao lado do cliente. O cliente vive duas personas no
ticket: **Solicitante** (quem abre) e **Beneficiário** (quem recebe o serviço),
além dos **Aprovadores** quando há fluxo de aprovação.

### Decisão

`TicketComment.visibility: enum ('PUBLIC' | 'INTERNAL')`:

- `PUBLIC`: visível a solicitante, beneficiário, aprovadores e equipe de atendimento
- `INTERNAL`: visível **exclusivamente** à equipe de atendimento
  (agentes do grupo, grupos solucionadores, MANAGER/ADMIN)

**Solicitante, Beneficiário e Aprovadores** estão sempre no lado "cliente" e
**nunca** veem comentários `INTERNAL`. A regra vale por **participação no ticket**
e independe da role do usuário no sistema (um aprovador que também seja AGENT continua
não vendo, salvo se atuar como equipe naquele ticket).

### Consequências

**Positivas:**

- Transparência com o cliente sem expor discussão técnica
- Um único enum (sem tabela separada)
- Proteção por participação (lado cliente vs equipe) — difícil de burlar

**Negativas:**

- Consultas precisam filtrar `visibility` baseado em quem consulta
- Requer regra clara no retorno da API e no Socket.IO

---

## ADR-008: Multiempresa via `company_id` (soft isolation)

**Status:** Aceito (fase atual) / Evolução: schema isolation
**Data:** 2026-09-07

### Contexto

O sistema atende N empresas com múltiplos usuários. A isolation deve permitir
crescimento sem rework total.

### Decisão

**Fase 1 (atual):** Soft multi-tenancy via coluna `company_id` em todas as
tabelas de domínio + guard global que filtra por empresa do usuário.

**Fase futura:** Migração para schema isolation quando necessário.

### Consequências

**Positivas:**

- Simples e funcional para o times inicial
- Guard centralizado garante isolation
- Migração futura documentada

**Negativas:**

- Risco de vazamento se guard não for aplicado em algum endpoint
- Índices compostos necessários para performance

---

## ADR-009: Real-time com Socket.IO

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

Operadores e usuários precisam de feedback imediato: novo ticket, novo
comentário, SLA breach, aprovação pendente.

### Decisão

Utilizar **Socket.IO** para eventos realtime:

| Evento             | Payload                           |
| ------------------ | --------------------------------- |
| `ticket.created`   | Ticket resumido                   |
| `ticket.updated`   | Ticket atualizado                 |
| `ticket.commented` | Comentário novo                   |
| `approval.pending` | Aprovação pendente para o usuário |
| `sla.breached`     | Alerta SLA                        |
| `notification`     | Notificação geral                 |

Rooms por `companyId` + `userId` para entrega direcionada.

### Consequências

**Positivas:**

- Experiência realtime para operadores
- Integração com TanStack Query (invalidate on event)

**Negativas:**

- Infraestrutura adicional (Redis adapter para scale)

---

## ADR-010: Frontend criado do zero seguindo padrão TailAdmin

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

O template TailAdmin oficial adiciona pesos desnecessários. O padrão visual e
estrutural do TailAdmin é bem definido e serve como referência.

### Decisão

Criar o frontend **do zero** seguindo os padrões do TailAdmin:

- Layout: Sidebar + Header + Main Content
- Componentes globais reutilizáveis:
  `Button`, `Card`, `Modal`, `Table`, `Badge`, `Input`, `Select`
- Design system com TailwindCSS v4
- Dark/Light mode
- Responsividade mobile-first

**Paleta de cores: Meta** (`#0082fb` / `#0064e0` / `#f1f5f8` / `#1c2b33`) aplicada
via tokens `@theme` no CSS, com derivações de tonalidade para hover e dark mode
(azul quase preto `#1c2b33` como base escura).

### Consequências

**Positivas:**

- Zero débito de código de terceiros
- Componentes próprios reutilizáveis
- Controle total do estilo

**Negativas:**

- Mais tempo de desenvolvimento inicial

---

## ADR-011: Modelo de Atribuição (Grupo + Agente + Auto-atribuição)

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

O negócio exige flexibilidade no direcionamento de tickets:

- Direcionar para **grupos solucionadores** (filas) e/ou **agentes específicos**
- **Auto-atribuição** na criação
- Segurança e coerência (agente sempre pertencente ao grupo)

### Decisão

**1. Grupo Solucionador como unidade de atendimento:**

- Grupo agrega 1 ou mais usuários `AGENT`
- Agente pertence a **exatamente 1** grupo (`solver_group_id` em User)

**2. Destino do ticket = grupo e/ou agente:**

- `solverGroupId` (nullable): direciona ao grupo (fila)
- `assigneeId` (nullable): direciona ao agente específico
- **Mínimo 1 destino** obrigatório; se ambos, agente **deve** pertencer ao grupo

**3. Auto-atribuição via `RoutingRule`:**

- Tabela `RoutingRule` com estratégias:
  - `TO_GROUP` → grupo fixo
  - `ROUND_ROBIN` → próximo agente do grupo em ciclo
  - `LEAST_LOADED` → agente com menos tickets abertos
  - `MANUAL` → sem auto-atribuição (MANAGER/ADMIN distribui)
- Regras avaliadas por `order` (tipo + prioridade + categoria)
- Ticket registra a origem do roteamento (`routedBy`)

**4. Pickup:**

- Agente pode **assumir** ticket da fila do **seu próprio grupo** (`POST /tickets/:id/pickup`)
- Valida role AGENT + pertencimento ao grupo destino

### Regras de Segurança

| Regra                       | Proteção                            |
| --------------------------- | ----------------------------------- |
| Grupo exige mínimo 1 agente | Validação na criação/edição         |
| Agente ∈ 1 grupo            | Unicidade de `solver_group_id`      |
| Coerência grupo+agente      | 422 se agente não pertence ao grupo |
| Grupo/agente inativos       | Rejeitam atribuição                 |
| Toda atribuição rastreável  | TicketHistory + AuditLog            |

### Consequências

**Positivas:**

- Modelo único atende fila (grupo) e atribuição direta (agente)
- Auto-atribuição configurável por empresa (sem code change)
- Segurança de coerência garantida no domínio, não só no UI

**Negativas:**

- Validações extras no backend (pertencimento, status, mínimo de agentes)
- ROUND_ROBIN exige estado de contador/ponteiro por grupo

---

## ADR-012: Numeração Amigável de Tickets

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

Usuários, clientes e e-mails precisam referenciar um ticket por um número
**legível e memorável** (como chamados de operadoras). UUID é técnico e ilegível.

### Decisão

Todo ticket recebe `ticketNumber` no formato:

```
SD-2026-000124
```

- **Prefixo**: `SD` (Service Desk), já fixo
- **Ano**: ano da abertura (4 dígitos)
- **Sequência**: zerofilled 6 dígitos, **por ano** (reinicia em 01/01)
- **Unicidade**: `UNIQUE` na tabela
- **Atômico**: `SequenceCounter` com `UPDATE ... RETURNING` na **mesma transação**
  da criação do ticket (sem buracos/lacunas por concorrência)
- O `id` UUID permanece como chave primária interna; `ticketNumber` é a chave de
  exibição
- Mesmo mecanismo para `CHANGE` (prefixo `SDC-`) e `PROBLEM` (prefixo `SDP-`)
- Multi-empresa futuro: sequência por `companyId` (ex: `SD-2026-ACME-000124`)

### Consequências

**Positivas:**

- Referência amigável em e-mails/badges/busca
- Buscável e indexável
- Reaproveitável para outras entidades

**Negativas:**

- Requer tabela `SequenceCounter` + transação atômica
- Coluna extra a manter sincronizada (sem reutilização de número a não ser que desejado)

---

## ADR-013: Internacionalização (i18n) desde o início

**Status:** Aceito
**Data:** 2026-09-07

### Contexto

A solução será usada por equipes multinacionais. Traduzir apenas as telas depois
geraria retrabalho e inconsistência. Decisão: suportar **PT-BR, EN-US e ES-ES**
desde a primeira versão.

### Decisão

**Idiomas suportados** (PT-BR é o fallback):

| Locale  | Idioma             | Papel               |
| ------- | ------------------ | ------------------- |
| `pt-BR` | Português (Brasil) | **Padrão/fallback** |
| `en-US` | Inglês (EUA)       | Suporte             |
| `es-ES` | Espanhol           | Suporte             |

**API (NestJS):**

- `nestjs-i18n` para tradução de mensagens (validação + exceções + regras de negócio)
- Detecção de idioma: `Accept-Language` header → `?lang=` → `User.locale` → `pt-BR`
- Respostas de erro sempre incluem `key` + `args` (leitura por máquina) **e** um
  `message` localizado humanamente legível; frontend usa `key/args` no seu próprio
  bundle i18next (fonte única de UI), `message` é fallback
- Arquivos de tradução por domínio: `src/i18n/{locale}/errors.json`, `validation.json`, `business.json`

**Frontend (React):**

- `i18next` + `react-i18next`
- Seletor de idioma no layout; preferência em `localStorage` + `User.locale`
  (sincronizado na API)
- Datas/números via `Intl` (locale do navegador); moeda via config da empresa

**Banco:**

- `User.locale` (texto, default `pt-BR`) — preferência por usuário
- Conteúdo criado pelo usuário (comentários, artigos) **não** é traduzido;
  apenas UI, mensagens de erro/sistema e e-mails transacionais

### Consequências

**Positivas:**

- Sem retrabalho de tradução pós-lançamento
- Resposta de erro com key → frontend mantém 100% do controle de idioma
- Novos idiomas = adicionar pasta de locale (API) + bundle (web)

**Negativas:**

- Duplicação semântica de strings entre API (`errors`) e Web (UI) nos arquivos
- `nestjs-i18n` adiciona dependência e config inicial
- Toda nova mensagem precisa de 3 traduções (pt-BR, en-US, es-ES)

---

## Lista de ADRs Futuros (TBD)

| ID      | Decisão Pendente                               |
| ------- | ---------------------------------------------- |
| ADR-014 | Migração para schema isolation (multi-tenancy) |
| ADR-015 | Estratégia de cache (Redis/Elasticache)        |
| ADR-016 | Queue/RabbitMQ para automação de fluxos        |
| ADR-017 | Containerização (Docker) e orquestração        |
| ADR-018 | Compartilhamento de tipos entre API e Web      |
