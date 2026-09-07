import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Impact, Priority, Urgency } from '@prisma/client';

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

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