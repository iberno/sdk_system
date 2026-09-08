import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Impact, ProblemStatus } from '@prisma/client';

const PROBLEM_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export class CreateProblemDto {
  @ApiProperty({ example: 'Falhas recorrentes no login' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Usuários relatando falha de autenticação intermitente' })
  @IsString()
  @MinLength(3)
  description: string;

  @ApiPropertyOptional({ enum: Impact })
  @IsOptional()
  @IsEnum(Impact)
  impact?: Impact;

  @ApiPropertyOptional({ description: 'Empresa (dispensável se o usuário tiver companyId)' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateProblemDto {
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

  @ApiPropertyOptional({ enum: Impact })
  @IsOptional()
  @IsEnum(Impact)
  impact?: Impact;

  @ApiPropertyOptional({ enum: PROBLEM_STATUSES })
  @IsOptional()
  @IsIn(PROBLEM_STATUSES)
  status?: ProblemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workaround?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  solution?: string;
}

export class LinkTicketDto {
  @ApiProperty()
  @IsString()
  ticketId: string;
}

export class QueryProblemsDto {
  @ApiPropertyOptional({ enum: PROBLEM_STATUSES })
  @IsOptional()
  @IsIn(PROBLEM_STATUSES)
  status?: ProblemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}