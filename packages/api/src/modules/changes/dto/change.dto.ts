import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ChangeStatus, ChangeType, Risk } from '@prisma/client';

const CHANGE_TYPES = ['STANDARD', 'NORMAL', 'EMERGENCY'] as const;
const CHANGE_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'ROLLED_BACK',
] as const;

export class CreateChangeDto {
  @ApiProperty({ example: 'Migração de banco de dados' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Migração do PG para cluster' })
  @IsString()
  @MinLength(3)
  description: string;

  @ApiPropertyOptional({ enum: CHANGE_TYPES })
  @IsOptional()
  @IsIn(CHANGE_TYPES)
  type?: ChangeType;

  @ApiPropertyOptional({ enum: Risk })
  @IsOptional()
  @IsEnum(Risk)
  risk?: Risk;

  @ApiProperty({ example: 'Necessidade de escalabilidade' })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiProperty({ example: '1. Backup... 2. Migrar... 3. Validar...' })
  @IsString()
  @MinLength(3)
  plan: string;

  @ApiProperty({ example: '1. Restaurar backup...' })
  @IsString()
  @MinLength(3)
  rollbackPlan: string;

  @ApiPropertyOptional({ example: '2026-02-01T02:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  solverGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateChangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @ApiPropertyOptional({ enum: CHANGE_TYPES })
  @IsOptional()
  @IsIn(CHANGE_TYPES)
  type?: ChangeType;

  @ApiPropertyOptional({ enum: Risk })
  @IsOptional()
  @IsEnum(Risk)
  risk?: Risk;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  rollbackPlan?: string;

  @ApiPropertyOptional({ example: '2026-02-01T02:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  solverGroupId?: string;
}

export class LinkChangeTicketDto {
  @ApiProperty()
  @IsString()
  ticketId: string;
}

export class QueryChangesDto {
  @ApiPropertyOptional({ enum: CHANGE_STATUSES })
  @IsOptional()
  @IsIn(CHANGE_STATUSES)
  status?: ChangeStatus;

  @ApiPropertyOptional({ enum: CHANGE_TYPES })
  @IsOptional()
  @IsIn(CHANGE_TYPES)
  type?: ChangeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
