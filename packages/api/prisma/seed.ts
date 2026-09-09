import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Senha@123';
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const YEAR = new Date().getFullYear();

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

async function clearAll() {
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.changeTicket.deleteMany();
  await prisma.problemTicket.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.change.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.sequenceCounter.deleteMany();
  await prisma.sLAPolicy.deleteMany();
  await prisma.approvalFlow.deleteMany();
  await prisma.user.deleteMany();
  await prisma.solverGroup.deleteMany();
  await prisma.company.deleteMany();
}

interface CategorySeed {
  name: string;
  order: number;
  children?: CategorySeed[];
}

const CATEGORY_TREE: CategorySeed[] = [
  {
    name: 'Software',
    order: 1,
    children: [
      {
        name: 'Windows',
        order: 1,
        children: [
          { name: 'Instalar Windows', order: 1 },
          { name: 'Erro de Licença', order: 2 },
          { name: 'Atualização', order: 3 },
        ],
      },
      {
        name: 'Pacote Office',
        order: 2,
        children: [
          { name: 'Outlook', order: 1 },
          { name: 'Word', order: 2 },
          { name: 'Excel', order: 3 },
        ],
      },
      {
        name: 'Sistemas Internos',
        order: 3,
        children: [
          { name: 'ERP', order: 1 },
          { name: 'CRM', order: 2 },
        ],
      },
    ],
  },
  {
    name: 'Hardware',
    order: 2,
    children: [
      {
        name: 'Impressora',
        order: 1,
        children: [
          { name: 'Driver', order: 1 },
          { name: 'Papel/Toner', order: 2 },
          { name: 'Trava de impressão', order: 3 },
        ],
      },
      {
        name: 'Notebook',
        order: 2,
        children: [
          { name: 'Bateria', order: 1 },
          { name: 'Tela', order: 2 },
          { name: 'Teclado', order: 3 },
        ],
      },
      {
        name: 'Periféricos',
        order: 3,
        children: [
          { name: 'Mouse', order: 1 },
          { name: 'Teclado externo', order: 2 },
        ],
      },
    ],
  },
  {
    name: 'Rede',
    order: 3,
    children: [
      { name: 'Sem internet', order: 1 },
      { name: 'Wi-Fi lento', order: 2 },
      { name: 'VPN', order: 3 },
    ],
  },
  {
    name: 'Acessos',
    order: 4,
    children: [
      {
        name: 'E-mail',
        order: 1,
        children: [
          { name: 'Criar conta', order: 1 },
          { name: 'Reset de senha', order: 2 },
        ],
      },
      { name: 'Pasta compartilhada', order: 2 },
      { name: 'Sistemas', order: 3 },
    ],
  },
];

async function main() {
  await clearAll();

  const password = await hash(PASSWORD, 10);

  const acme = await prisma.company.create({
    data: {
      id: DEFAULT_COMPANY_ID,
      name: 'ACME Corp',
      cnpj: '12.345.678/0001-90',
      status: 'ACTIVE',
    },
  });
  await prisma.company.create({
    data: { name: 'Beta Ltda', cnpj: '98.765.432/0001-10', status: 'ACTIVE' },
  });
  await prisma.company.create({
    data: { name: 'Gamma S.A.', cnpj: '11.222.333/0001-44', status: 'PENDING' },
  });

  const categoryIds = new Map<string, { id: string }>();
  const insertCategory = async (
    node: CategorySeed,
    parent: { id: string; path: string } | null,
    depth: number,
  ) => {
    const path = parent ? `${parent.path} > ${node.name}` : node.name;
    const row = await prisma.category.create({
      data: {
        name: node.name,
        parentId: parent?.id ?? null,
        path,
        depth,
        order: node.order,
        status: 'ACTIVE',
      },
    });
    categoryIds.set(node.name, { id: row.id });
    for (const child of node.children ?? []) {
      await insertCategory(child, { id: row.id, path }, depth + 1);
    }
  };
  for (const node of CATEGORY_TREE) {
    await insertCategory(node, null, 0);
  }

  const catImpPapel = categoryIds.get('Papel/Toner')!.id;
  const catERP = categoryIds.get('ERP')!.id;
  const catCRM = categoryIds.get('CRM')!.id;
  const catVPN = categoryIds.get('VPN')!.id;
  const catNotebook = categoryIds.get('Notebook')!.id;
  const catEmail = categoryIds.get('Criar conta')!.id;
  const catPasta = categoryIds.get('Pasta compartilhada')!.id;

  const groups = [
    {
      name: 'Suporte N1',
      level: 'N1',
      description: 'Atendimento de primeira linha',
    },
    {
      name: 'Suporte N2',
      level: 'N2',
      description: 'Atendimento de segunda linha',
    },
    { name: 'Suporte N3', level: 'N3', description: 'Especialistas técnicos' },
    { name: 'Rede', level: 'REDES', description: 'Infraestrutura de rede' },
    {
      name: 'Infraestrutura',
      level: 'INFRA',
      description: 'Servidores e storage',
    },
    { name: 'DevOps', level: 'DEVOPS', description: 'CI/CD e ambientes' },
  ] as const;

  const groupIds = new Map<string, { id: string }>();
  for (const g of groups) {
    const row = await prisma.solverGroup.create({
      data: {
        name: g.name,
        level: g.level,
        description: g.description,
        status: 'ACTIVE',
      },
    });
    groupIds.set(g.name, { id: row.id });
  }

  const groupN1 = groupIds.get('Suporte N1')!.id;
  const groupN2 = groupIds.get('Suporte N2')!.id;
  const groupN3 = groupIds.get('Suporte N3')!.id;
  const groupRedes = groupIds.get('Rede')!.id;
  const groupInfra = groupIds.get('Infraestrutura')!.id;
  const groupDevops = groupIds.get('DevOps')!.id;

  const usersData = [
    {
      name: 'Administrador',
      email: 'admin@sdesk.dev',
      role: 'ADMIN',
      department: 'TI',
    },
    {
      name: 'Gerente de TI',
      email: 'manager@sdesk.dev',
      role: 'MANAGER',
      department: 'TI',
    },
    {
      name: 'Ana Souza',
      email: 'ana@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupN1,
      department: 'TI',
    },
    {
      name: 'Bruno Lima',
      email: 'bruno@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupN1,
      department: 'TI',
    },
    {
      name: 'Carla Dias',
      email: 'carla@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupN2,
      department: 'TI',
    },
    {
      name: 'Gabriel Prado',
      email: 'gabriel@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupN3,
      department: 'TI',
    },
    {
      name: 'Daniel Costa',
      email: 'daniel@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupInfra,
      department: 'TI',
    },
    {
      name: 'Elena Rocha',
      email: 'elena@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupDevops,
      department: 'TI',
    },
    {
      name: 'Fábio Nunes',
      email: 'fabio@sdesk.dev',
      role: 'AGENT',
      solverGroupId: groupRedes,
      department: 'TI',
    },
    {
      name: 'Gustavo Pereira',
      email: 'gustavo@sdesk.dev',
      role: 'USER',
      department: 'Financeiro',
    },
    {
      name: 'Helena Martins',
      email: 'helena@sdesk.dev',
      role: 'USER',
      department: 'RH',
    },
    {
      name: 'Ivan Alves',
      email: 'ivan@sdesk.dev',
      role: 'USER',
      department: 'Comercial',
    },
  ] as const;

  const userIds = new Map<string, { id: string }>();
  for (const u of usersData) {
    const row = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password,
        role: u.role,
        status: 'ACTIVE',
        locale: 'pt-BR',
        companyId: acme.id,
        department: u.department,
        ...('solverGroupId' in u ? { solverGroupId: u.solverGroupId } : {}),
      },
    });
    userIds.set(u.email, { id: row.id });
  }

  const adminId = userIds.get('admin@sdesk.dev')!.id;
  const managerId = userIds.get('manager@sdesk.dev')!.id;
  const anaId = userIds.get('ana@sdesk.dev')!.id;
  const brunoId = userIds.get('bruno@sdesk.dev')!.id;
  const carlaId = userIds.get('carla@sdesk.dev')!.id;
  const danielId = userIds.get('daniel@sdesk.dev')!.id;
  const elenaId = userIds.get('elena@sdesk.dev')!.id;
  const fabioId = userIds.get('fabio@sdesk.dev')!.id;
  const gustavoId = userIds.get('gustavo@sdesk.dev')!.id;
  const helenaId = userIds.get('helena@sdesk.dev')!.id;
  const ivanId = userIds.get('ivan@sdesk.dev')!.id;

  await prisma.routingRule.createMany({
    data: [
      {
        name: 'Incidentes → N1',
        ticketType: 'INCIDENT',
        strategy: 'TO_GROUP',
        targetGroupId: groupN1,
        order: 0,
        status: 'ACTIVE',
        companyId: acme.id,
      },
      {
        name: 'Pedidos N1 (Round Robin)',
        ticketType: 'SERVICE_REQUEST',
        priority: 'MEDIUM',
        strategy: 'ROUND_ROBIN',
        targetGroupId: groupN1,
        order: 1,
        status: 'ACTIVE',
        companyId: acme.id,
      },
      {
        name: 'Incidente grave → Infra (menos carregado)',
        ticketType: 'INCIDENT',
        priority: 'HIGH',
        strategy: 'LEAST_LOADED',
        targetGroupId: groupInfra,
        order: 2,
        status: 'ACTIVE',
        companyId: acme.id,
      },
      {
        name: 'Demais → manual',
        ticketType: 'INCIDENT',
        strategy: 'MANUAL',
        order: 99,
        status: 'ACTIVE',
        companyId: acme.id,
      },
    ],
  });

  await prisma.sequenceCounter.createMany({
    data: [
      { entityType: 'TICKET', year: YEAR, lastValue: 12, companyId: acme.id },
      { entityType: 'CHANGE', year: YEAR, lastValue: 0, companyId: acme.id },
      { entityType: 'PROBLEM', year: YEAR, lastValue: 0, companyId: acme.id },
    ],
  });

  const sla = await prisma.sLAPolicy.createMany({
    data: [
      {
        name: 'Incidente LOW',
        type: 'INCIDENT',
        priority: 'LOW',
        responseTime: 1440,
        resolveTime: 4320,
        status: 'ACTIVE',
      },
      {
        name: 'Incidente MEDIUM',
        type: 'INCIDENT',
        priority: 'MEDIUM',
        responseTime: 480,
        resolveTime: 2880,
        status: 'ACTIVE',
      },
      {
        name: 'Incidente HIGH',
        type: 'INCIDENT',
        priority: 'HIGH',
        responseTime: 120,
        resolveTime: 1440,
        status: 'ACTIVE',
      },
      {
        name: 'Incidente CRITICAL',
        type: 'INCIDENT',
        priority: 'CRITICAL',
        responseTime: 30,
        resolveTime: 240,
        status: 'ACTIVE',
      },
      {
        name: 'Pedido LOW',
        type: 'SERVICE_REQUEST',
        priority: 'LOW',
        responseTime: 4320,
        resolveTime: 8640,
        status: 'ACTIVE',
      },
      {
        name: 'Pedido MEDIUM',
        type: 'SERVICE_REQUEST',
        priority: 'MEDIUM',
        responseTime: 2880,
        resolveTime: 5760,
        status: 'ACTIVE',
      },
      {
        name: 'Pedido HIGH',
        type: 'SERVICE_REQUEST',
        priority: 'HIGH',
        responseTime: 1440,
        resolveTime: 2880,
        status: 'ACTIVE',
      },
      {
        name: 'Pedido CRITICAL',
        type: 'SERVICE_REQUEST',
        priority: 'CRITICAL',
        responseTime: 480,
        resolveTime: 1440,
        status: 'ACTIVE',
      },
    ],
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      {
        title: 'Como abrir um chamado',
        content:
          'Acesse o portal, clique em Novo Chamado e descreva o problema...',
        category: 'Guia',
        tags: ['chamado', 'portal'],
        published: true,
        authorId: adminId,
      },
      {
        title: 'Reinício seguro de serviço Windows',
        content:
          'Para reiniciar um serviço sem impactar usuários, verifique sessões ativas antes...',
        category: 'Infraestrutura',
        tags: ['windows', 'servico'],
        published: true,
        authorId: danielId,
      },
      {
        title: 'VPN - resolução rápida',
        content:
          'Verifique conectividade com o gateway, DNS e certificados antes de abrir chamado de rede...',
        category: 'Recuperação',
        tags: ['vpn', 'rede'],
        published: false,
        authorId: fabioId,
      },
    ],
  });

  await prisma.approvalFlow.createMany({
    data: [
      {
        name: 'Aprovação de Mudança - TI',
        description: 'NORMAL/EMERGENCY exigem aprovação gerencial em 2 etapas',
        entityType: 'CHANGE',
        rules: {
          stages: [
            { order: 1, approverRole: 'MANAGER' },
            { order: 2, approverRole: 'ADMIN' },
          ],
        } as Prisma.InputJsonValue,
        status: 'ACTIVE',
        companyId: acme.id,
      },
      {
        name: 'Aprovação de Ticket VIP',
        description: 'Tickets de prioridade CRITICAL exigem aval do gestor',
        entityType: 'TICKET',
        rules: {
          stages: [{ order: 1, approverRole: 'MANAGER' }],
        } as Prisma.InputJsonValue,
        status: 'ACTIVE',
        companyId: acme.id,
      },
    ],
  });

  const now = new Date();
  const tickets: Prisma.TicketUncheckedCreateInput[] = [
    {
      ticketNumber: 'SD-2026-000001',
      requesterId: gustavoId,
      beneficiaryId: gustavoId,
      title: 'Impressora não imprime',
      description: 'Impressora do 3º andar parada desde ontem',
      type: 'INCIDENT',
      priority: 'HIGH',
      impact: 'MEDIUM',
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
      companyId: acme.id,
      solverGroupId: groupN1,
      assigneeId: anaId,
      categoryId: catImpPapel,
      slaResponseAt: hoursFromNow(2),
      slaResolveAt: hoursFromNow(24),
    },
    {
      ticketNumber: 'SD-2026-000002',
      requesterId: helenaId,
      beneficiaryId: helenaId,
      title: 'Erro ao acessar o ERP',
      description: 'Tela de login retorna erro 500',
      type: 'INCIDENT',
      priority: 'MEDIUM',
      impact: 'HIGH',
      urgency: 'MEDIUM',
      status: 'OPEN',
      companyId: acme.id,
      solverGroupId: groupN1,
      categoryId: catERP,
      slaResponseAt: hoursFromNow(8),
      slaResolveAt: hoursFromNow(48),
    },
    {
      ticketNumber: 'SD-2026-000003',
      requesterId: managerId,
      beneficiaryId: gustavoId,
      title: 'Solicitação de novo notebook',
      description: 'Notebook antigo sem suporte do fabricante',
      type: 'SERVICE_REQUEST',
      priority: 'MEDIUM',
      impact: 'LOW',
      urgency: 'LOW',
      status: 'OPEN',
      companyId: acme.id,
      solverGroupId: groupN1,
      categoryId: catNotebook,
      slaResponseAt: hoursFromNow(48),
      slaResolveAt: hoursFromNow(96),
    },
    {
      ticketNumber: 'SD-2026-000004',
      requesterId: ivanId,
      beneficiaryId: ivanId,
      title: 'Servidor de aplicação lento',
      description: 'Tempo de resposta acima de 10s em horário de pico',
      type: 'INCIDENT',
      priority: 'HIGH',
      impact: 'HIGH',
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
      companyId: acme.id,
      solverGroupId: groupInfra,
      assigneeId: danielId,
      slaResponseAt: hoursFromNow(2),
      slaResolveAt: hoursFromNow(24),
    },
    {
      ticketNumber: 'SD-2026-000005',
      requesterId: ivanId,
      beneficiaryId: ivanId,
      title: 'Banco indisponível para filial',
      description: 'Sem acesso ao banco comercial desde as 8h',
      type: 'INCIDENT',
      priority: 'CRITICAL',
      impact: 'CRITICAL',
      urgency: 'CRITICAL',
      status: 'WAITING_APPROVAL',
      companyId: acme.id,
      solverGroupId: groupN2,
      assigneeId: carlaId,
      slaResponseAt: hoursFromNow(1),
      slaResolveAt: hoursFromNow(4),
    },
    {
      ticketNumber: 'SD-2026-000006',
      requesterId: gustavoId,
      beneficiaryId: helenaId,
      title: 'Acesso à pasta compartilhada',
      description: 'Necessário acesso de leitura ao drive de projetos',
      type: 'SERVICE_REQUEST',
      priority: 'LOW',
      impact: 'LOW',
      urgency: 'LOW',
      status: 'RESOLVED',
      companyId: acme.id,
      solverGroupId: groupN1,
      assigneeId: brunoId,
      categoryId: catPasta,
      resolvedAt: hoursFromNow(-2),
    },
    {
      ticketNumber: 'SD-2026-000007',
      requesterId: helenaId,
      beneficiaryId: helenaId,
      title: 'Mouse sem funcionar',
      description: 'Troca de periférico solicitada',
      type: 'INCIDENT',
      priority: 'LOW',
      impact: 'LOW',
      urgency: 'LOW',
      status: 'CLOSED',
      companyId: acme.id,
      solverGroupId: groupN1,
      assigneeId: anaId,
      resolvedAt: hoursFromNow(-24),
      closedAt: hoursFromNow(-23),
    },
    {
      ticketNumber: 'SD-2026-000008',
      requesterId: gustavoId,
      beneficiaryId: gustavoId,
      title: 'Instalação do novo CRM',
      description: 'Instalar cliente CRM nas estações do comercial',
      type: 'SERVICE_REQUEST',
      priority: 'HIGH',
      impact: 'MEDIUM',
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
      companyId: acme.id,
      solverGroupId: groupDevops,
      assigneeId: elenaId,
      categoryId: catCRM,
      slaResponseAt: hoursFromNow(24),
      slaResolveAt: hoursFromNow(48),
    },
    {
      ticketNumber: 'SD-2026-000009',
      requesterId: ivanId,
      beneficiaryId: ivanId,
      title: 'Problema de conectividade no polo',
      description: 'Quedas intermitentes de rede a cada 15 min',
      type: 'INCIDENT',
      priority: 'MEDIUM',
      impact: 'HIGH',
      urgency: 'MEDIUM',
      status: 'WAITING_USER',
      companyId: acme.id,
      solverGroupId: groupRedes,
      assigneeId: fabioId,
      slaResponseAt: hoursFromNow(8),
      slaResolveAt: hoursFromNow(48),
    },
    {
      ticketNumber: 'SD-2026-000010',
      requesterId: helenaId,
      beneficiaryId: helenaId,
      title: 'Criar e-mail corporativo',
      description: 'Novo colaborador entrará na próxima semana',
      type: 'SERVICE_REQUEST',
      priority: 'MEDIUM',
      impact: 'LOW',
      urgency: 'MEDIUM',
      status: 'OPEN',
      companyId: acme.id,
      solverGroupId: groupN1,
      categoryId: catEmail,
      slaResponseAt: hoursFromNow(48),
      slaResolveAt: hoursFromNow(96),
    },
    {
      ticketNumber: 'SD-2026-000011',
      requesterId: gustavoId,
      beneficiaryId: gustavoId,
      title: 'VPN não conecta (remoto)',
      description: 'Cliente VPN falha ao estabelecer túnel',
      type: 'INCIDENT',
      priority: 'HIGH',
      impact: 'MEDIUM',
      urgency: 'HIGH',
      status: 'OPEN',
      companyId: acme.id,
      solverGroupId: groupRedes,
      assigneeId: fabioId,
      categoryId: catVPN,
      slaResponseAt: hoursFromNow(2),
      slaResolveAt: hoursFromNow(24),
    },
    {
      ticketNumber: 'SD-2026-000012',
      requesterId: ivanId,
      beneficiaryId: gustavoId,
      title: 'Arquivos corrompidos no servidor',
      description: 'Documentos de projetos apresentam erro de abertura',
      type: 'INCIDENT',
      priority: 'MEDIUM',
      impact: 'MEDIUM',
      urgency: 'MEDIUM',
      status: 'RESOLVED',
      companyId: acme.id,
      solverGroupId: groupN3,
      assigneeId: carlaId,
      resolvedAt: hoursFromNow(-4),
    },
  ];

  const ticketIds = new Map<string, { id: string; status: string }>();
  for (const t of tickets) {
    const row = await prisma.ticket.create({ data: t });
    ticketIds.set(t.ticketNumber, { id: row.id, status: row.status });
  }

  const t1 = ticketIds.get('SD-2026-000001')!.id;
  const t4 = ticketIds.get('SD-2026-000004')!.id;
  const t5 = ticketIds.get('SD-2026-000005')!.id;
  const t6 = ticketIds.get('SD-2026-000006')!.id;
  const t9 = ticketIds.get('SD-2026-000009')!.id;
  const t11 = ticketIds.get('SD-2026-000011')!.id;

  await prisma.ticketComment.createMany({
    data: [
      {
        ticketId: t1,
        authorId: anaId,
        visibility: 'INTERNAL',
        content:
          'Diagnóstico: cabeça de impressão obstruída. Trocando cartucho.',
      },
      {
        ticketId: t1,
        authorId: anaId,
        visibility: 'PUBLIC',
        content: 'Olá Gustavo, estamos verificando sua impressora.',
      },
      {
        ticketId: t4,
        authorId: danielId,
        visibility: 'INTERNAL',
        content: 'Hipótese: pico de CPU por query não indexada no app',
      },
      {
        ticketId: t5,
        authorId: carlaId,
        visibility: 'INTERNAL',
        content: 'Critical: coordenando com a equipe de banco.',
      },
      {
        ticketId: t6,
        authorId: brunoId,
        visibility: 'PUBLIC',
        content: 'Acesso concedido. Confirme se consegue visualizar a pasta.',
      },
    ],
  });

  await prisma.ticketHistory.createMany({
    data: [
      {
        ticketId: t1,
        userId: anaId,
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
      {
        ticketId: t1,
        userId: anaId,
        field: 'assigneeId',
        oldValue: null,
        newValue: anaId,
      },
      {
        ticketId: t5,
        userId: carlaId,
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'WAITING_APPROVAL',
      },
      {
        ticketId: t6,
        userId: brunoId,
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'RESOLVED',
      },
    ],
  });

  await prisma.problem.create({
    data: {
      title: 'Quedas recorrentes de conexão no polo',
      description:
        'Incidentes repetidos de conectividade nas últimas 2 semanas',
      status: 'OPEN',
      impact: 'HIGH',
      companyId: acme.id,
      tickets: { create: [{ ticketId: t9 }, { ticketId: t11 }] },
    },
  });

  const change = await prisma.change.create({
    data: {
      title: 'Upgrade de versão do banco de dados',
      description: 'Migração para versão 17 do PostgreSQL',
      type: 'NORMAL',
      status: 'PENDING_APPROVAL',
      risk: 'HIGH',
      reason: 'Suporte de longo prazo e correções de segurança',
      plan: 'Janela de manutenção de 2h com banco em modo read-only',
      rollbackPlan: 'Restauração a partir do snapshot pré-migração',
      companyId: acme.id,
      requesterId: managerId,
    },
  });

  await prisma.approval.createMany({
    data: [
      {
        changeId: change.id,
        approverId: managerId,
        order: 1,
        status: 'PENDING',
      },
      { changeId: change.id, approverId: adminId, order: 2, status: 'PENDING' },
      { ticketId: t5, approverId: managerId, order: 1, status: 'PENDING' },
    ],
  });

  console.log('Seed concluído:');
  console.log(
    `  Empresas: 3 | Grupos: ${groups.length} | Usuários: ${usersData.length}`,
  );
  console.log(
    `  Categorias: ${categoryIds.size} | RoutingRules: 4 | SLA: ${sla.count} | KB: 3 | ApprovalFlows: 2`,
  );
  console.log(`  Tickets: ${tickets.length} | Mudanças: 1 | Problemas: 1`);
  console.log(`  Senha padrão dos seed users: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
