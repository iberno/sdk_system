# Service Desk ITIL v4

Plataforma corporativa de gerenciamento de tickets baseada em ITIL v4.
Arquitetura monorepo com **API (NestJS)** e **Frontend (React)**.

---

## Documentação

| Documento                              | Descrição                                                  |
| -------------------------------------- | ---------------------------------------------------------- |
| [docs/ERD.md](docs/ERD.md)             | Diagrama Entidade-Relacionamento (ERD)                     |
| [docs/FLUXOS.md](docs/FLUXOS.md)       | Fluxos de atendimento (Incidente, Mudança, Aprovação, SLA) |
| [docs/API.md](docs/API.md)             | Contratos dos endpoints da API                             |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisões de arquitetura (ADRs)                             |
| [docs/TODO.md](docs/TODO.md)           | Checklist de implementação guiado                          |

---

## Stack Tecnológica

### Backend

- Node.js v24+
- NestJS 12
- TypeScript 6
- Prisma ORM 6
- PostgreSQL 17+
- JWT (Passport)
- Swagger ( `/swagger` )
- Socket.IO
- bcryptjs
- @nestjs/throttler (rate limiting)

### Frontend

- React 19
- Vite 8
- TypeScript 6
- TailwindCSS v4 (padrão TailAdmin)
- TanStack Query 5
- Zustand 5
- Axios
- Socket.IO Client
- React Router 7
- lucide-react
- i18next (pt-BR, en-US, es-ES)

---

## Requisitos

- Node.js v24+
- pnpm v11+
- PostgreSQL v17+

---

## Configuração Rápida

### 1. Verificar pré-requisitos

```bash
node --version   # v24+
pnpm --version   # v11+
pg_isready       # PostgreSQL rodando
```

### 2. Criar banco de dados

```bash
psql -U postgres -c "CREATE DATABASE servicedesk;"
psql -U postgres -c "CREATE ROLE servicedesk WITH LOGIN PASSWORD 'senha_dev';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE servicedesk TO servicedesk;"
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL
```

### 4. Instalar dependências

```bash
pnpm install
```

### 5. Rodar migrações e seed

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### 6. Iniciar em desenvolvimento

```bash
# Terminal 1 - API (porta 3000)
pnpm dev:api

# Terminal 2 - Frontend (porta 5173)
pnpm dev:web

# Ou ambos em paralelo
pnpm dev
```

---

## Credenciais de Demo

Após rodar o seed, use estas credenciais:

| Email             | Senha     | Role    | Observação    |
| ----------------- | --------- | ------- | ------------- |
| admin@sdesk.dev   | Senha@123 | ADMIN   | Acesso total  |
| manager@sdesk.dev | Senha@123 | MANAGER | Gerente de TI |
| bruno@sdesk.dev   | Senha@123 | AGENT   | Suporte N1    |
| gustavo@sdesk.dev | Senha@123 | USER    | Financeiro    |

---

## Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # API + Web em paralelo
pnpm dev:api          # Só API
pnpm dev:web          # Só Web

# Build
pnpm build            # Build todos os pacotes

# Testes
pnpm test             # Testes unitários
pnpm test:e2e         # Testes E2E (API)

# Lint & Format
pnpm lint             # Lint (oxlint)
pnpm format           # Format (prettier)
pnpm format:check     # Verificar formatação

# Banco de dados
pnpm prisma:generate  # Gerar Prisma Client
pnpm prisma:migrate   # Rodar migrações
pnpm prisma:seed      # Rodar seed
```

---

## Estrutura do Projeto

```
ServiceDesk/
├── packages/
│   ├── api/                     # Backend NestJS
│   │   ├── prisma/              # Schema e migrations
│   │   ├── src/
│   │   │   ├── modules/         # Módulos (auth, tickets, users, etc.)
│   │   │   ├── common/          # Guards, decorators, filters
│   │   │   └── i18n/            # Traduções backend
│   │   └── test/                # Testes E2E
│   └── web/                     # Frontend React
│       └── src/
│           ├── components/      # Componentes UI
│           ├── hooks/           # Custom hooks
│           ├── pages/           # Páginas
│           ├── stores/          # Zustand stores
│           ├── i18n/            # Traduções frontend
│           └── lib/             # Utilitários
├── docs/                        # Documentação
├── .prettierrc                  # Config Prettier
├── .husky/                      # Git hooks
└── package.json                 # Root package.json
```

---

## Funcionalidades

### ITIL v4 Completo

- **Incidentes e Requisições de Serviço** com roteamento automático
- **Gestão de Problemas** com análise de causa raiz
- **Gestão de Mudanças** com fluxo de aprovação
- **Base de Conhecimento** com artigos vinculados
- **SLA** com monitoramento e breach alerts

### Multi-empresa

- Isolamento de dados por empresa
- Roteamento escopado por empresa
- Usuários vinculados a empresas

### Equipe

- Grupos solucionadores (N1, N2, N3, Infra, Redes, DevOps)
- Roteamento automático (TO_GROUP, ROUND_ROBIN, LEAST_LOADED)
- Atribuição manual e pickup

### Aprovações

- Fluxos configuráveis por etapas
- Aprovadores por role, grupo ou usuário
- Integração com tickets e mudanças

### Realtime

- Socket.IO para atualizações em tempo real
- Toasts para novos tickets, atribuições, aprovações
- Invalidação automática de cache

### i18n

- Português (pt-BR), Inglês (en-US), Espanhol (es-ES)
- Troca de idioma no header
- Persistência no localStorage

---

## API

A API está disponível em `http://localhost:3000/api`.

### Documentação Swagger

Acesse `http://localhost:3000/swagger` para a documentação interativa.

### Endpoints Principais

| Método | Rota                      | Descrição             |
| ------ | ------------------------- | --------------------- |
| POST   | /api/auth/login           | Login                 |
| POST   | /api/auth/refresh         | Refresh token         |
| GET    | /api/tickets              | Listar tickets        |
| POST   | /api/tickets              | Criar ticket          |
| GET    | /api/tickets/:id          | Detalhe do ticket     |
| POST   | /api/tickets/:id/comments | Adicionar comentário  |
| POST   | /api/tickets/:id/assign   | Atribuir ticket       |
| POST   | /api/tickets/:id/pickup   | Assumir ticket        |
| GET    | /api/dashboard/summary    | Resumo do dashboard   |
| GET    | /api/categories           | Categorias (árvore)   |
| GET    | /api/companies/options    | Opções de empresas    |
| GET    | /api/users/directory      | Diretório de usuários |

---

## Licença

Projeto privado - Uso interno.
