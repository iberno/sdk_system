import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TicketsService } from './tickets.service.js';
import { ApprovalsService } from '../approvals/approvals.service.js';
import { RequestTicketApprovalDto } from '../approvals/dto/approval.dto.js';
import { QueryTicketsDto } from './dto/query-tickets.dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import {
  AssignTicketDto,
  PickupTicketDto,
  ReassignTicketsDto,
} from './dto/assign-ticket.dto.js';
import {
  CreateCommentDto,
  UpdateTicketStatusDto,
} from './dto/status-comment.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '../../../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.ms-excel',
]);

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly approvals: ApprovalsService,
  ) {}

  @Get()
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Lista tickets com filtros avançados' })
  findAll(@Query() query: QueryTicketsDto, @CurrentUser() actor: UserContext) {
    return this.tickets.findAll(query, actor);
  }

  @Get('unassigned')
  @Permissions('tickets.pickup')
  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Fila de pickup do grupo do usuário autenticado' })
  unassigned(@CurrentUser() actor: UserContext) {
    return this.tickets.unassigned(actor);
  }

  @Post()
  @Permissions('tickets.create')
  @ApiOperation({
    summary: 'Cria ticket (auto-roteamento + SLA + ticketNumber)',
  })
  create(@Body() dto: CreateTicketDto, @CurrentUser() actor: UserContext) {
    return this.tickets.create(dto, actor);
  }

  @Post('reassign')
  @HttpCode(HttpStatus.OK)
  @Permissions('tickets.assign')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Reatribuição em lote (MANAGER/ADMIN)' })
  reassign(@Body() dto: ReassignTicketsDto, @CurrentUser() actor: UserContext) {
    return this.tickets.reassign(
      dto.ticketIds,
      dto.assigneeId,
      dto.solverGroupId,
      actor,
    );
  }

  @Get(':id')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Detalhe completo com timeline, comments, history' })
  findOne(@Param('id') id: string, @CurrentUser() actor: UserContext) {
    return this.tickets.findOne(id, actor);
  }

  @Put(':id')
  @Permissions('tickets.update')
  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @ApiOperation({
    summary: 'Atualiza campos (priority/impact/urgency: MANAGER+)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.tickets.update(id, dto, actor);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Permissions('tickets.assign')
  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Atribui/reatribui grupo e/ou agente' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.tickets.assign(id, dto.assigneeId, dto.solverGroupId, actor);
  }

  @Post(':id/pickup')
  @HttpCode(HttpStatus.OK)
  @Permissions('tickets.pickup')
  @Roles('AGENT')
  @ApiOperation({ summary: 'Agente assume ticket da fila do grupo' })
  pickup(
    @Param('id') id: string,
    @Body() dto: PickupTicketDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.tickets.pickup(id, dto.solverGroupId, actor);
  }

  @Post(':id/request-approval')
  @HttpCode(HttpStatus.OK)
  @Permissions('tickets.approval')
  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @ApiOperation({
    summary: 'Submete ticket a um fluxo de aprovação (WAITING_APPROVAL)',
  })
  requestApproval(
    @Param('id') id: string,
    @Body() dto: RequestTicketApprovalDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.approvals.requestForTicket(dto.flowId, id, actor);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Transição de status validada (state machine)' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.tickets.changeStatus(id, dto, actor);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.OK)
  @Permissions('tickets.comment')
  @ApiOperation({ summary: 'Adiciona comentário (PUBLIC | INTERNAL)' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() actor: UserContext,
  ) {
    return this.tickets.addComment(id, dto, actor);
  }

  @Post(':id/attachments')
  @Permissions('tickets.attach')
  @Roles('AGENT', 'MANAGER', 'ADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload de anexo (máx 10MB)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
          cb(
            null,
            `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
          );
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMETYPES.has(file.mimetype)) return cb(null, true);
        cb(
          new UnprocessableEntityException({
            key: 'business.attachment_type',
            error: 'UnprocessableEntity',
            args: { type: file.mimetype },
          }),
          false,
        );
      },
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: UserContext,
  ) {
    if (!file) {
      throw new UnprocessableEntityException({
        key: 'business.attachment_required',
        error: 'UnprocessableEntity',
      });
    }
    return this.tickets.addAttachment(
      id,
      {
        filename: file.originalname,
        url: join(UPLOAD_DIR, file.filename),
        size: file.size,
        mimetype: file.mimetype,
      },
      actor,
    );
  }

  @Get(':id/attachments/:attachmentId/download')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Download/visualização de anexo' })
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() actor: UserContext,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const attachment = await this.tickets.getAttachment(
      id,
      attachmentId,
      actor,
    );
    if (!attachment || !existsSync(attachment.url)) {
      throw new UnprocessableEntityException({
        key: 'errors.not_found',
        error: 'UnprocessableEntity',
      });
    }
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    return new Promise<void>((resolve, reject) => {
      const stream = createReadStream(attachment.url);
      stream.on('end', () => resolve());
      stream.on('error', reject);
      stream.pipe(res);
    });
  }
}
