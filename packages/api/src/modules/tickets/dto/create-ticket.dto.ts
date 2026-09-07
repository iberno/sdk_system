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
}