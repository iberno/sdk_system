# Contratos da API - Service Desk ITIL v4

## Visão Geral

Especificação RESTful da API. Todos os endpoints são prefixados com `/api`.
Autenticação via JWT Bearer Token. Respostas em formato JSON padrão.

**Base URL:** `http://localhost:3000/api`

---

## Padrão de Respostas

### Sucesso

```json
{
  "statusCode": 200,
  "message": "Operação realizada com sucesso",
  "data": { }
}
```

### Pacto de Erro

```json
{
  "statusCode": 400,
  "status": "BAD_REQUEST",
  "error": "ValidationError",
  "i18n": {
    "key": "validation.title_required",
    "args": { "property": "title" }
  },
  "message": "O campo título é obrigatório"
}
```

- `message`: texto **já localizado no idioma da requisição** (fallback `pt-BR`)
- `i18n.key` + `i18n.args`: identificador estável para o frontend traduzir de forma
  consistente no próprio bundle (fonte única de UI)
- `key` é o mesmo em todos os idiomas; apenas o conteúdo de `message` muda

### Internacionalização (i18n)

**Idiomas suportados:** `pt-BR` (padrão), `en-US`, `es-ES` — ver ADR-013.

**Como o idioma é escolhido (em ordem de precedência):**

1. Query param `?lang=en-US`
2. Header `Accept-Language: en-US`
3. `User.locale` (preferência salva no usuário)
4. Fallback `pt-BR`

**Exemplo:**
```
POST /api/tickets?lang=en-US          → mensagens em inglês
POST /api/tickets                      → usa Accept-Language, depois User.locale
```

**Domínios de mensagens (arquivos de tradução da API):**
- `errors.*` — erros HTTP/infra
- `validation.*` — erros de validação (class-validator)
- `business.*` — regras de negócio (ex: grupo sem agente, agente fora do grupo)

### Paginação

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

---

## Autenticação

### POST `/auth/login`

Autentica usuário e retorna access + refresh token.

**Request:**
```json
{
  "email": "admin@sdesk.com",
  "password": "secret123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d1f2a3b4c5e6f7a8b9c0d1e2f3a4b5c6...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@sdesk.com",
    "role": "ADMIN",
    "solverGroup": null
  }
}
```

### POST `/auth/refresh`

Gira tokens usando refresh token válido.

**Request:**
```json
{
  "refreshToken": "d1f2a3b4c5e6f7a8b9c0d1e2f3a4b5c6..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "novo-token-rotacionado...",
  "expiresIn": 900
}
```

### POST `/auth/logout`

Revoga refresh token.

```
Authorization: Bearer <accessToken>
```

---

## Usuários

### GET `/users`

Lista usuários com filtros e paginação.

**Query Params:**
| Param | Tipo | Opcional |
|-------|------|----------|
| `page` | number | Sim (default: 1) |
| `pageSize` | number | Sim (default: 20) |
| `search` | string | Sim (nome/email) |
| `role` | string | Sim (ADMIN, MANAGER,...) |
| `companyId` | uuid | Sim |
| `solverGroupId` | uuid | Sim |
| `status` | string | Sim |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@empresa.com",
      "role": "AGENT",
      "status": "ACTIVE",
      "solverGroup": {
        "id": "uuid",
        "name": "N1",
        "level": "N1"
      },
      "company": {
        "id": "uuid",
        "name": "Empresa X"
      },
      "createdAt": "2026-01-01T10:00:00Z"
    }
  ],
  "pagination": { }
}
```

### POST `/users`

Cria usuário.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "password": "senha123",
  "role": "AGENT",
  "companyId": "uuid",
  "solverGroupId": "uuid"
}
```

### GET `/users/:id`

Detalhes do usuário (com permissões efetivas).

```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "role": "AGENT",
  "status": "ACTIVE",
  "solverGroup": {
    "id": "uuid",
    "name": "N1",
    "level": "N1"
  },
  "permissions": [
    "ticket.create",
    "ticket.update",
    "ticket.assign"
  ]
}
```

### PUT `/users/:id`

Atualiza usuário.

> **Regra:** `role` e `solverGroupId` só alteráveis por ADMIN.

### PATCH `/users/:id/status`

Altera status do usuário (ACTIVE/INACTIVE/PENDING).

---

## Empresas

### CRUD Complet /companies

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/companies` | Lista empresas |
| POST | `/companies` | Cria empresa |
| GET | `/companies/:id` | Detalhes |
| PUT | `/companies/:id` | Atualiza |
| DELETE | `/companies/:id` | Desativa (soft delete) |

**Modelo:**
```json
{
  "id": "uuid",
  "name": "Empresa X",
  "cnpj": "12.345.678/0001-90",
  "status": "ACTIVE",
  "usersCount": 10,
  "ticketsCount": 120
}
```

---

## Grupos Solucionadores

### CRUD /solver-groups

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/solver-groups` | Lista grupos |
| POST | `/solver-groups` | Cria grupo |
| GET | `/solver-groups/:id` | Detalhes |
| PUT | `/solver-groups/:id` | Atualiza |
| PATCH | `/solver-groups/:id/status` | Ativa/Desativa |

**Modelo:**
```json
{
  "id": "uuid",
  "name": "N1 - Atendimento",
  "description": "Primeiro nível de atendimento",
  "level": "N1",
  "status": "ACTIVE",
  "agentsCount": 5,
  "openTickets": 12
}
```

**Níveis Disponíveis:**
`N1, N2, N3, N4, REDES, INFRA, DEVOPS, DATABASE, SECURITY`

**Regras do Grupo Solucionador:**

| Regra | Descrição |
|-------|-----------|
| Mínimo de agentes | **1 agente obrigatório** (validação na criação/edição) |
| Máximo | Ilimitado |
| Vínculo | Grupo ← usuários AGENT via `solver_group_id` |
| Exclusividade | Um agente pertence a **1** grupo |
| Grupo vazio | Não pode ser criado/associado sem ao menos 1 agente |
| Nível | O nível (N1..N3, DEVOPS...) define o fluxo de escala |

**Editar agentes do grupo:**
```
PUT /solver-groups/:id/agents
{
  "agentIds": ["uuid1", "uuid2", "uuid3"]  // substitui a lista (mín. 1)
}
```
> Ao remover um agente, tickets `IN_PROGRESS` dele continuam com ele; novos tickets seguem as regras de roteamento.

---

## Routing Rules (Auto-atribuição)

### CRUD /routing-rules

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/routing-rules` | Lista regras |
| POST | `/routing-rules` | Cria regra |
| GET | `/routing-rules/:id` | Detalhes |
| PUT | `/routing-rules/:id` | Atualiza |
| PATCH | `/routing-rules/:id/status` | Ativa/Desativa |
| POST | `/routing-rules/reorder` | Define ordem de avaliação |

**Request POST:**
```json
{
  "name": "Incidentes críticos → N2",
  "ticketType": "INCIDENT",
  "priority": "CRITICAL",
  "strategy": "TO_GROUP",
  "targetGroupId": "uuid",
  "order": 1
}
```

**Estratégias (RoutingStrategy):**

| Estratégia | Comportamento | Pré-requisito |
|------------|---------------|---------------|
| `TO_GROUP` | Direciona para grupo fixo (agente fica null) | `targetGroupId` obrigatório |
| `ROUND_ROBIN` | Atribui ao próximo agente do grupo em ciclo | `targetGroupId` obrigatório |
| `LEAST_LOADED` | Atribui ao agente do grupo com menos tickets abertos | `targetGroupId` obrigatório |
| `MANUAL` | Sem auto-atribuição; MANAGER/ADMIN distribui | `targetGroupId` opcional |

**Avaliação:** regras são testadas em ordem crescente de `order`. A primeira que casar
tipo + prioridade + categoria domina. Ticket sem regra → grupo padrão da empresa.

**Response GET `/routing-rules`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Incidentes críticos → N2",
      "ticketType": "INCIDENT",
      "priority": "CRITICAL",
      "strategy": "TO_GROUP",
      "targetGroup": { "id": "uuid", "name": "N2", "level": "N2" },
      "agentsCount": 5,
      "order": 1,
      "status": "ACTIVE"
    }
  ]
}
```

---

## Tickets

### GET `/tickets`

Lista tickets com filtros avançados.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | number | Paginação |
| `pageSize` | number | Limite (max 100) |
| `search` | string | Busca por título ou **ticketNumber** (ex: `SD-2026-000124`) |
| `ticketNumber` | string | Busca exata por número amigável |
| `status` | TicketStatus | Filtro por status |
| `type` | TicketType | INCIDENT/SERVICE_REQUEST |
| `priority` | Priority | LOW/MEDIUM/HIGH/CRITICAL |
| `assigneeId` | uuid | Atribuído a |
| `requesterId` | uuid | Solicitante (quem abriu) |
| `beneficiaryId` | uuid | Beneficiário (quem recebe o serviço) |
| `companyId` | uuid | Empresa |
| `solverGroupId` | uuid | Grupo |
| `slaBreached` | boolean | SLA violado |
| `sortBy` | string | createdAt, priority, status |
| `order` | string | ASC/DESC |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "SD-2026-000124",
      "title": "Servidor fora do ar",
      "description": "Erro 500 ao acessar",
      "type": "INCIDENT",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "impact": "HIGH",
      "urgency": "MEDIUM",
      "slaResponseAt": "2026-01-01T10:30:00Z",
      "slaResolveAt": "2026-01-01T18:00:00Z",
      "slaBreached": false,
      "requester": { "id": "uuid", "name": "João" },
      "beneficiary": { "id": "uuid", "name": "Maria" },
      "assignee": { "id": "uuid", "name": "Carlos" },
      "solverGroup": { "id": "uuid", "name": "INFRA" },
      "company": { "id": "uuid", "name": "Empresa X" },
      "createdAt": "2026-01-01T10:00:00Z",
      "resolvedAt": null
    }
  ],
  "pagination": { }
}
```

### POST `/tickets`

Cria ticket.

**Request:**
```json
{
  "title": "Servidor fora do ar",
  "description": "Erro 500 ao acessar painel principal",
  "type": "INCIDENT",
  "beneficiaryId": "uuid"  // opcional - se omitido, assume o solicitante
}
```

> **Sistema preenche:** `requesterId` (do JWT - solicitante), `companyId` (do usuário),
> status `OPEN`, priority/impact/urgency default `MEDIUM`, SLA calculado.
> **Beneficiário:** se `beneficiaryId` omitido → copia `requesterId`.

**Roteamento automático na criação:**

Após criar, o sistema roda as `RoutingRule`, gera o `ticketNumber` e popula o destino:

```json
{
  "id": "uuid",
  "ticketNumber": "SD-2026-000124",
  "status": "OPEN",
  "requester": { "id": "uuid", "name": "João" },
  "beneficiary": { "id": "uuid", "name": "João" },
  "solverGroup": { "id": "uuid", "name": "N1" },
  "assignee": null,
  "routedBy": {
    "auto": true,
    "strategy": "TO_GROUP",
    "routingRuleId": "uuid",
    "appliedAt": "2026-01-01T10:00:01Z"
  }
}
```
> Se `strategy = ROUND_ROBIN` ou `LEAST_LOADED`, `assignee` vem preenchido.
> O `ticketNumber` é gerado atomicamente (`SequenceCounter`) — formato `SD-{ano}-{sequência}`.

### GET `/tickets/:id`

Detalhe completo do ticket com histórico e comentários.
> **Visibilidade:** Solicitante e Beneficiário recebem apenas comentários `PUBLIC`.
> Comentários `INTERNAL` só aparecem para agentes/equipe.

```json
{
  "id": "uuid",
  "ticketNumber": "SD-2026-000124",
  "title": "Servidor fora do ar",
  "type": "INCIDENT",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "requester": { "id": "uuid", "name": "João" },
  "beneficiary": { "id": "uuid", "name": "Maria" },
  "approvals": [
    {
      "id": "uuid",
      "status": "PENDING",
      "order": 1,
      "approver": { "id": "uuid", "name": "Diretor Tec." }
    }
  ],
  "timeline": {
    "createdAt": "2026-01-01T10:00:00Z",
    "firstResponseAt": "2026-01-01T10:15:00Z",
    "resolvedAt": null,
    "closedAt": null
  },
  "comments": [
    {
      "id": "uuid",
      "content": "Verificando servidor...",
      "visibility": "PUBLIC",
      "author": { "name": "Maria" },
      "createdAt": "2026-01-01T10:20:00Z"
    }
  ],
  "history": [
    {
      "field": "status",
      "oldValue": "OPEN",
      "newValue": "IN_PROGRESS",
      "userId": "uuid",
      "createdAt": "2026-01-01T10:15:00Z"
    }
  ],
  "attachments": [],
  "approvals": [],
  "relatedProblem": null,
  "relatedChanges": []
}
```

### PUT `/tickets/:id`

Atualiza campos do ticket (somente AGENT/MANAGER/ADMIN).

| Campo | Regra |
|-------|-------|
| `title` | Qualquer agente |
| `description` | Qualquer agente |
| `priority` | MANAGER+ (altera SLA) |
| `impact` | MANAGER+ |
| `urgency` | MANAGER+ |
| `status` | Agente responsável |

### POST `/tickets/:id/assign`

Atribui ou reatribui ticket para **grupo e/ou agente**.

**Request:**
```json
{
  "assigneeId": "uuid",      // opcional - agente específico
  "solverGroupId": "uuid"    // opcional - grupo (mín. um dos dois)
}
```

**Contratos de validação:**

| Caso | Comportamento |
|------|---------------|
| Só `solverGroupId` | Ticket entra na fila do grupo; qualquer agente do grupo pode assumir |
| Só `assigneeId` | Atribui direto ao agente (que deve ser AGENT + ACTIVE) |
| Grupo + Agente | Agente **deve pertencer** ao grupo (senão → `422 Unprocessable`) |
| Nem um nem outro | `400 Bad Request` |
| Grupo inativo | `422` - grupo não recebe tickets |
| Agente inativo | `422` - agente não recebe tickets |

**Response (200):**
```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "assignee": { "id": "uuid", "name": "Maria", "solverGroupId": "uuid" },
  "solverGroup": { "id": "uuid", "name": "N2" },
  "routedBy": {
    "auto": false,
    "strategy": null,
    "routingRuleId": null
  },
  "history": [
    { "field": "assigneeId", "oldValue": null, "newValue": "uuid", "createdAt": "..." }
  ]
}
```

### POST `/tickets/:id/pickup`

Agente assume um ticket que está na **fila do grupo** (agente ainda não atribuído).

```json
{
  "solverGroupId": "uuid"  // grupo ao qual o agente pertence
}
```

**Validadações:** role AGENT; agente pertence ao grupo; ticket sem `assigneeId`.

### POST `/tickets/reassign` (batch)

Reatribuição em lote (MANAGER/ADMIN).

```json
{
  "ticketIds": ["uuid1", "uuid2"],
  "assigneeId": "uuid",
  "solverGroupId": "uuid"
}
```

### GET `/tickets/unassigned`

Tickets na fila (sem agente) para pickup — filtra por grupo do usuário autenticado.

### POST `/tickets/:id/status`

Transição de status (valida transições válidas).

**Request:**
```json
{
  "status": "RESOLVED",
  "resolutionNote": "Servidor reiniciado e monitorado"
}
```

### POST `/tickets/:id/comments`

Adiciona comentário.

```json
{
  "content": "Verificando servidor...",
  "visibility": "PUBLIC"
}
```

**Visibilidade permitida ao criar:**

| `visibility` | Quem pode criar | Quem vê |
|--------------|-----------------|---------|
| `PUBLIC` | Qualquer participante | Solicitante, beneficiário, agentes, aprovadores |
| `INTERNAL` | Apenas equipe (AGENT/MANAGER/ADMIN ou do grupo solucionador) | **Somente equipe de atendimento** |

> **Regra de ouro:** `INTERNAL` é exclusivo da equipe. Solicitante, **beneficiário e
> aprovadores** nunca o veem (lado "cliente"), mesmo que tenham role administrativa
> configurada. A proteção vale por **participação no ticket**, não por role.

### POST `/tickets/:id/attachments`

Upload de anexo (multipart/form-data).

### GET `/tickets/export`

Exporta CSV/Excel com filtros atuais.

---

## SLA Policies

### CRUD /sla-policies

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/sla-policies` | Lista políticas |
| POST | `/sla-policies` | Cria política |
| GET | `/sla-policies/:id` | Detalhes |
| PUT | `/sla-policies/:id` | Atualiza |
| PATCH | `/sla-policies/:id/status` | Ativa/Desativa |

**Request POST:**
```json
{
  "name": "Incidente Crítico",
  "description": "SLA para incidentes críticos",
  "type": "INCIDENT",
  "priority": "CRITICAL",
  "responseTime": 15,
  "resolveTime": 240
}
```

---

## Problemas

### CRUD /problems

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/problems` | Lista problemas |
| POST | `/problems` | Cria problema |
| GET | `/problems/:id` | Detalhes |
| PUT | `/problems/:id` | Atualiza |
| POST | `/problems/:id/link-ticket` | Vincula ticket |
| DELETE | `/problems/:id/unlink-ticket` | Desvincula ticket |

**Request POST:**
```json
{
  "title": "Falhas recorrentes no login",
  "description": "Usuários relatando falha de autenticação",
  "impact": "HIGH"
}
```

---

## Mudanças

### CRUD /changes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/changes` | Lista mudanças |
| POST | `/changes` | Cria mudança |
| GET | `/changes/:id` | Detalhes |
| PUT | `/changes/:id` | Atualiza |
| POST | `/changes/:id/submit` | Envia para aprovação |
| POST | `/changes/:id/execute` | Executa mudança |
| POST | `/changes/:id/rollback` | Executa rollback |
| POST | `/changes/:id/link-ticket` | Vincula ticket |

**Request POST:**
```json
{
  "title": "Migração de banco de dados",
  "description": "Migração do PG para cluster",
  "type": "NORMAL",
  "risk": "HIGH",
  "reason": "Necessidade de escalabilidade",
  "plan": "1. Backup... 2. Migrar... 3. Validar...",
  "rollbackPlan": "1. Restaurar backup...",
  "scheduledAt": "2026-02-01T02:00:00Z",
  "solverGroupId": "uuid"
}
```

---

## Aprovações

### GET `/appro-val/approvals`

⚠️ **Correção:** Rota é `/approvals`

Lista aprovações do usuário autenticado.

```
GET /approvals?status=PENDING
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "PENDING",
      "order": 1,
      "flowName": "Mudança em produção",
      "entity": {
        "type": "CHANGE",
        "id": "uuid",
        "title": "Migração de banco de dados"
      },
      "requester": { "name": "João" },
      "createdAt": "2026-01-05T10:00:00Z"
    }
  ]
}
```

### POST `/approvals/:id/approve`

```json
{
  "comment": "Aprovado. Risco mitigado."
}
```

### POST `/approvals/:id/reject`

```json
{
  "comment": "Precisamos de mais informações"
}
```

---

## Fluxos de Aprovação

### CRUD /approval-flows

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/approval-flows` | Lista fluxos |
| POST | `/approval-flows` | Cria fluxo |
| GET | `/approval-flows/:id` | Detalhes |
| PUT | `/approval-flows/:id` | Atualiza |

**Request POST:**
```json
{
  "name": "Mudança em produção",
  "entityType": "CHANGE",
  "rules": {
    "stages": [
      {
        "order": 1,
        "approverRole": "MANAGER",
        "approverCategory": "TECHNICAL",
        "solverGroupId": "uuid"
      },
      {
        "order": 2,
        "approverRole": "ADMIN",
        "approverCategory": "BUSINESS"
      }
    ]
  }
}
```

---

## Base de Conhecimento

### CRUD /knowledge

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/knowledge` | Lista artigos publicados |
| GET | `/knowledge?draft=true` | Lista rascunhos (AGENT+) |
| POST | `/knowledge` | Cria artigo |
| GET | `/knowledge/:id` | Detalhes |
| PUT | `/knowledge/:id` | Atualiza |
| POST | `/knowledge/:id/publish` | Publica |
| DELETE | `/knowledge/:id` | Remove |

**Request POST:**
```json
{
  "title": "Como resetar senha do usuário",
  "content": "Passo a passo...",
  "category": "AUTHENTICATION",
  "tags": ["senha", "login", "reset"]
}
```

---

## Auditoria

### GET `/audit`

Lista logs de auditoria.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `entity` | string | Ticket, User, Change |
| `entityId` | uuid | Id da entidade |
| `action` | string | CREATE, UPDATE, LOGIN |
| `userId` | uuid | Usuário que executou |
| `startDate` | datetime | Filtro inicial |
| `endDate` | datetime | Filtro final |
| `page` | number | Paginação |
| `pageSize` | number | Limite |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "UPDATE",
      "entity": "Ticket",
      "entityId": "uuid",
      "oldData": { "status": "OPEN" },
      "newData": { "status": "IN_PROGRESS" },
      "user": { "id": "uuid", "name": "Maria" },
      "ip": "10.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-01-01T10:15:00Z"
    }
  ]
}
```

---

## Dashboard

### GET `/dashboard/summary`

Resumo operacional para o dashboard.

**Response:**
```json
{
  "period": { "start": "2026-01-01", "end": "2026-01-07" },
  "totals": {
    "openTickets": 45,
    "inProgress": 22,
    "resolved": 130,
    "slaBreached": 3,
    "avgFirstResponseMin": 18,
    "avgResolutionHours": 9.5
  },
  "byPriority": {
    "CRITICAL": 5,
    "HIGH": 12,
    "MEDIUM": 20,
    "LOW": 8
  },
  "byStatus": {
    "OPEN": 45,
    "IN_PROGRESS": 22,
    "PENDING": 10,
    "RESOLVED": 130
  },
  "byType": {
    "INCIDENT": 145,
    "SERVICE_REQUEST": 62
  },
  "byGroup": [
    { "group": "N1", "count": 40 },
    { "group": "INFRA", "count": 25 }
  ],
  "trend": [
    { "date": "2026-01-01", "created": 20, "resolved": 18 },
    { "date": "2026-01-02", "created": 25, "resolved": 22 }
  ]
}
```

---

## Resumo de Endpoints

| Área | Métodos | Total |
|------|---------|-------|
| /auth | POST ×3, GET ×1 | 4 |
| /users | GET ×2, POST, PUT, PATCH | 5 |
| /companies | CRUD | 5 |
| /solver-groups | CRUD + status + agents | 6 |
| /routing-rules | CRUD + status + reorder | 6 |
| /tickets | GET ×3, POST ×7 | 10 |
| /sla-policies | CRUD + status | 5 |
| /problems | CRUD + link/unlink | 7 |
| /changes | CRUD + actions | 8 |
| /approvals | GET, POST ×2 | 3 |
| /approval-flows | CRUD | 4 |
| /knowledge | CRUD + publish | 7 |
| /audit | GET | 1 |
| /dashboard | GET | 1 |
| **Total** | | **72** |

---

## Swagger

Documentação interativa disponível em:
`http://localhost:3000/swagger` (em desenvolvimento)