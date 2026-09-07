import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiPropertyOptional({ example: 'Servidor reiniciado e monitorado' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Verificando servidor...' })
  @IsString()
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'INTERNAL'], default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(['PUBLIC', 'INTERNAL'])
  visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC';
}