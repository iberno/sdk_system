import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Impact, Priority, TicketType, Urgency } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Servidor fora do ar' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Erro 500 ao acessar painel principal' })
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  description: string;

  @ApiProperty({ enum: TicketType, example: TicketType.INCIDENT })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiPropertyOptional({
    description: 'Se omitido, assume o próprio solicitante',
  })
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiPropertyOptional({
    description:
      'Solicitante do chamado (apenas equipe). Deve pertencer à mesma empresa do chamado; padrão: usuário logado',
  })
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: Impact })
  @IsOptional()
  @IsEnum(Impact)
  impact?: Impact;

  @ApiPropertyOptional({ enum: Urgency })
  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @ApiPropertyOptional({
    description:
      'Empresa do chamado (default: a do usuário logado). Equipe pode abrir para qualquer empresa ATIVA.',
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Categoria hierárquica (folha da árvore de categorias)',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
