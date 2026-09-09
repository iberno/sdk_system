import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApprovalStatus } from '@prisma/client';

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export class RequestTicketApprovalDto {
  @ApiProperty({ description: 'Fluxo de aprovação a aplicar ao ticket' })
  @IsString()
  flowId: string;
}

export class ApproveDto {
  @ApiPropertyOptional({ example: 'Aprovado. Risco mitigado.' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectDto {
  @ApiProperty({ example: 'Precisamos de mais informações' })
  @IsString()
  @MinLength(3)
  comment: string;
}

export class QueryApprovalsDto {
  @ApiPropertyOptional({ enum: APPROVAL_STATUSES })
  @IsOptional()
  @IsIn(APPROVAL_STATUSES)
  status?: ApprovalStatus;
}
