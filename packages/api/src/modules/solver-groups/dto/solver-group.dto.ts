import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { GroupLevel, Status, TicketStatus } from '@prisma/client';

export class CreateSolverGroupDto {
  @ApiProperty({ example: 'N1 - Atendimento' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Primeiro nível de atendimento' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: GroupLevel, default: GroupLevel.N1 })
  @IsEnum(GroupLevel)
  level!: GroupLevel;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiProperty({ description: 'Mínimo 1 agente AGENT/ACTIVE', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  agentIds!: string[];
}

export class UpdateSolverGroupDto {
  @ApiPropertyOptional({ example: 'N1 - Atendimento' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ enum: GroupLevel })
  @IsOptional()
  @IsEnum(GroupLevel)
  level?: GroupLevel;
}

export class ReplaceAgentsDto {
  @ApiProperty({ description: 'Lista completa de agentes do grupo (substitui atual)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  agentIds!: string[];
}

export class UpdateSolverGroupStatusDto {
  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  @IsNotEmpty()
  status!: Status;
}

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING,
  TicketStatus.WAITING_USER,
  TicketStatus.WAITING_APPROVAL,
];