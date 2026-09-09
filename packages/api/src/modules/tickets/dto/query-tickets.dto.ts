import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Priority, TicketStatus, TicketType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryTicketsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Nº amigável ex.: SD-2026-000124' })
  @IsOptional()
  @IsString()
  ticketNumber?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  solverGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  slaBreached?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unassigned?: boolean;

  @ApiPropertyOptional({ enum: ['createdAt', 'priority', 'status'] })
  @IsOptional()
  @IsIn(['createdAt', 'priority', 'status'])
  sortBy?: 'createdAt' | 'priority' | 'status';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC', 'asc', 'desc'],
    description: 'Case-insensitive (minúsculo é normalizado no serviço)',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
