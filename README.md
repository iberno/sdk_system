# Service Desk ITIL v4

Plataforma corporativa de gerenciamento de tickets baseada em ITIL v4.
Arquitetura monorepo com **API (NestJS)** e **Frontend (React)**.

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [docs/ERD.md](docs/ERD.md) | Diagrama Entidade-Relacionamento (ERD) |
| [docs/FLUXOS.md](docs/FLUXOS.md) | Fluxos de atendimento (Incidente, Mudança, Aprovação, SLA) |
| [docs/API.md](docs/API.md) | Contratos dos endpoints da API |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisões de arquitetura (ADRs) |
| [docs/TODO.md](docs/TODO.md) | Checklist de implementação guiado |

---

## Stack Tecnológica

### Backend
- Node.js v24
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (Passport)
- Swagger
- Socket.IO
- bcryptjs
- @nestjs/throttler

### Frontend
- React
- Vite
- TypeScript
- TailwindCSS v4 (padrão TailAdmin)
- TanStack Query
- Zustand
- Axios
- Socket.IO Client
- React Router
- lucide-react

---

## Estrutura do Projeto

```
ServiceDesk/
├── packages/
│   ├── api/                     # Backend NestJS
│   └── web/                     # Frontend React
├── docs/                        # Documentação do projeto
│   ├── ERD.md
│   ├── FLUXOS.md
│   ├── API.md
│   ├── DECISIONS.md
│   └── TODO.md
├── package.json                 # Root package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Requisitos

- Node.js v24+
- pnpm v9+
- PostgreSQL v18+

---

## Configuração Rápida

```bash
# Verificar pré-requisitos
node --version   # v24+
pnpm --version

# Criar banco no PostgreSQL
psql -U postgres -c "CREATE DATABASE servicedesk;"

# Instalar dependências
pnpm install
```

---

## Próximos Passos

Siga o [docs/TODO.md](docs/TODO.md) a partir da **Fase 0**.