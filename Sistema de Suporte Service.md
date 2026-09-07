# Sistema de Suporte (Service Desk) ITIL v4
---
# 1. OBJETIVO DO PROJETO

Desenvolver uma plataforma corporativa de gerenciamento de tickets baseada nas melhores práticas do ITIL v4, com arquitetura moderna, modular, escalável e orientada a APIs.

1 Empresa de atendimento com N Empregados em diferentes grupos solucionadores, fazem atendimento a N Empresas como clientes e diversos usuários.

- Planejamento do Sistema (Requisitos)
- ERD Diagrama Relacional
- Fluxo de Atendimento

- Fluxo de Aprovação 
- Grupo Solucionador (N1, N2, N3, REDES, INFRA, DEVOPS ...)

O sistema deverá atender processos de:

- Gestão de Incidentes
- Gestão de Requisições de Serviço
- Gestão de Problemas
- Gestão de Mudanças
- Aprovações Multietapas
- SLA Inteligente
- Base de Conhecimento
- Auditoria Completa
- Automação de Fluxos (Fluxo)
- Dashboard Operacional
- Multiempresa (futuro)

---

# 2. OBJETIVOS TÉCNICOS

## Requisitos Estratégicos

- Escalabilidade horizontal
- Arquitetura modular
- API RESTful
- Preparação para microsserviços
- Alta rastreabilidade
- Segurança corporativa
- Facilidade de manutenção
- Baixo acoplamento
- Alta coesão
- Responsividade
- Preparação mobile

---

# 3. STACK TECNOLÓGICA

## Backend

| Tecnologia | Finalidade |
|---|---|
| Node.js v24 | Runtime |
| NestJS | Framework backend |
| TypeScript | Linguagem principal |
| Prisma ORM | ORM |
| PostgreSQL v18 | Banco relacional |
| JWT (Passport) | Autenticação |
| Swagger | Documentação API |
| Socket.IO | Realtime |
| bcryptjs | Hash de senhas |
| @nestjs/throttler | Rate limiter (30 req/60s) |

---

## Frontend

| Tecnologia | Finalidade |
|---|---|
| React | Frontend |
| Vite | Build |
| TypeScript | Linguagem |
| TailwindCSS v4 (TailAdmin) | 
| Componentes Globais TailwindCSS v4 |
| TanStack Query (React Query) | Cache e requests |
| Zustand | Gerenciamento de estado |
| Axios | HTTP Client |
| Socket.IO Client | Realtime |
| React Router | Roteamento |
| lucide-react | Ícones SVG |

 
