import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

export interface TicketCreatedPayload {
  ticketId: string;
  ticketNumber: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  companyId: string;
  requesterId: string;
  beneficiaryId: string | null;
  solverGroupId: string | null;
  assigneeId: string | null;
  createdAt: string;
}

export interface TicketUpdatedPayload {
  ticketId: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  companyId: string;
  updatedAt: string;
}

export interface TicketCommentedPayload {
  ticketId: string;
  ticketNumber: string;
  commentId: string;
  authorId: string;
  companyId: string;
  visibility: string;
  content: string;
  createdAt: string;
  exceptUserIds?: string[];
}

export interface TicketAssignedPayload {
  ticketId: string;
  ticketNumber: string;
  title: string;
  type: string;
  priority: string;
  companyId: string;
  assignedBy: string;
  assignedAt: string;
}

export interface ApprovalPendingPayload {
  approvalId: string;
  order: number;
  flowName: string;
  entityType: string;
  ticketId?: string;
  changeId?: string;
}

export interface SlaBreachedPayload {
  ticketId: string;
  ticketNumber: string;
  companyId: string;
  solverGroupId: string | null;
  slaResolveAt: string;
}

@WebSocketGateway({ cors: { origin: '*', credentials: true } })
@Injectable()
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const raw = socket.handshake.auth?.token ?? socket.handshake.query?.token;
      if (typeof raw !== 'string' || !raw) {
        throw new Error('missing token');
      }
      const payload = await this.jwt.verifyAsync<UserContext>(raw, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'default_secret',
      });
      socket.data.user = payload;
      const rooms = [`company:${payload.companyId}`, `user:${payload.sub}`];
      if (payload.solverGroupId) rooms.push(`group:${payload.solverGroupId}`);
      await socket.join(rooms);
      this.logger.log(
        `socket connected user=${payload.sub} company=${payload.companyId}`,
      );
    } catch {
      socket.disconnect(true);
    }
  }

  emitTicketCreated(payload: TicketCreatedPayload) {
    this.server
      .to(this.roomsFor(payload.companyId, payload.solverGroupId))
      .emit('ticket.created', payload);
    this.server.to(`user:${payload.requesterId}`).emit('ticket.created', payload);
    if (payload.beneficiaryId) {
      this.server.to(`user:${payload.beneficiaryId}`).emit('ticket.created', payload);
    }
  }

  emitTicketUpdated(payload: TicketUpdatedPayload) {
    this.server
      .to(`company:${payload.companyId}`)
      .emit('ticket.updated', payload);
  }

  emitTicketCommented(payload: TicketCommentedPayload) {
    if (payload.visibility === 'INTERNAL') {
      void this.#emitToCompanyExceptParticipants(payload);
      return;
    }
    this.server
      .to(`company:${payload.companyId}`)
      .emit('ticket.commented', payload);
  }

  emitTicketAssigned(userId: string, payload: TicketAssignedPayload) {
    this.server.to(`user:${userId}`).emit('ticket.assigned', payload);
  }

  emitApprovalPending(userId: string, payload: ApprovalPendingPayload) {
    this.server.to(`user:${userId}`).emit('approval.pending', payload);
  }

  emitSlaBreached(payload: SlaBreachedPayload) {
    this.server
      .to(this.roomsFor(payload.companyId, payload.solverGroupId))
      .emit('sla.breached', payload);
  }

  async #emitToCompanyExceptParticipants(payload: TicketCommentedPayload) {
    const except = new Set(payload.exceptUserIds ?? []);
    const sockets = await this.server.in(`company:${payload.companyId}`).fetchSockets();
    for (const socket of sockets) {
      const user = socket.data?.user as UserContext | undefined;
      if (!user) continue;
      if (user.role === 'USER') continue;
      if (except.has(user.sub)) continue;
      socket.emit('ticket.commented', payload);
    }
  }

  private roomsFor(companyId: string, solverGroupId: string | null): string[] {
    const rooms = [`company:${companyId}`];
    if (solverGroupId) rooms.push(`group:${solverGroupId}`);
    return rooms;
  }
}