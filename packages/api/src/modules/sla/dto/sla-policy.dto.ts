import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Priority, SLAType, Status } from '@prisma/client';

export class CreateSlapolicyDto {
  @ApiProperty({ example: 'Incidente Crítico' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: SLAType })
  @IsEnum(SLAType)
  type!: SLAType;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;

  @ApiProperty({ description: 'Tempo de resposta (minutos)' })
  @IsInt()
  @Min(1)
  responseTime!: number;

  @ApiProperty({ description: 'Tempo de resolução (minutos)' })
  @IsInt()
  @Min(1)
  resolveTime!: number;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateSlapolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  responseTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  resolveTime?: number;
}

export class UpdateSlapolicyStatusDto {
  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  @IsNotEmpty()
  status!: Status;
}

export interface SlaComputed {
  responseMinutes: number;
  resolveMinutes: number;
  slaResponseAt: Date;
  slaResolveAt: Date;
}
