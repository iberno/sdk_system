import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignTicketDto {
  @ApiPropertyOptional({ description: 'Agente específico (opcional)' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Grupo solucionador (opcional)' })
  @IsOptional()
  @IsString()
  solverGroupId?: string;
}

export class PickupTicketDto {
  @ApiProperty({ description: 'Grupo ao qual o agente pertence' })
  @IsString()
  solverGroupId: string;
}

export class ReassignTicketsDto {
  @ApiProperty({ isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  ticketIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  solverGroupId?: string;
}