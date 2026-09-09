import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Status } from '@prisma/client';

const FLOW_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;
const ENTITY_TYPES = ['TICKET', 'CHANGE'] as const;

export class CreateApprovalFlowDto {
  @ApiProperty({ example: 'Aprovação de Ticket VIP' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ENTITY_TYPES, example: 'TICKET' })
  @IsIn(ENTITY_TYPES)
  entityType: string;

  @ApiProperty({
    example: {
      stages: [
        { order: 1, approverRole: 'MANAGER' },
        { order: 2, approverRole: 'ADMIN' },
      ],
    },
  })
  @IsObject()
  rules: Record<string, unknown>;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsIn(FLOW_STATUSES)
  status?: Status;

  @ApiPropertyOptional({
    description: 'Empresa (dispensável se o usuário tiver companyId)',
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateApprovalFlowDto {
  @ApiPropertyOptional({ example: 'Aprovação de Ticket VIP' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ENTITY_TYPES })
  @IsOptional()
  @IsIn(ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}

export class UpdateFlowStatusDto {
  @ApiProperty({ enum: Status })
  @IsIn(FLOW_STATUSES)
  status: Status;
}

export class QueryApprovalFlowsDto {
  @ApiPropertyOptional({ enum: ENTITY_TYPES })
  @IsOptional()
  @IsIn(ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsIn(FLOW_STATUSES)
  status?: Status;

  @ApiPropertyOptional({ description: 'Filtro por empresa (ADMIN)' })
  @IsOptional()
  @IsString()
  companyId?: string;
}
