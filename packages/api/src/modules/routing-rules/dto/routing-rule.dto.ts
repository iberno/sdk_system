import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, RoutingStrategy, Status, TicketType } from '@prisma/client';

export class CreateRoutingRuleDto {
  @ApiProperty({ example: 'Incidentes críticos → N2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ enum: TicketType })
  @IsEnum(TicketType)
  ticketType!: TicketType;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ example: 'rede' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: RoutingStrategy })
  @IsEnum(RoutingStrategy)
  strategy!: RoutingStrategy;

  @ApiPropertyOptional({
    description: 'Obrigatório para TO_GROUP/ROUND_ROBIN/LEAST_LOADED',
  })
  @IsOptional()
  @IsString()
  targetGroupId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateRoutingRuleDto {
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

  @ApiPropertyOptional({ enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: RoutingStrategy })
  @IsOptional()
  @IsEnum(RoutingStrategy)
  strategy?: RoutingStrategy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order!: number;
}

export class ReorderRulesDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  rules!: ReorderItemDto[];
}

export class UpdateRoutingRuleStatusDto {
  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  @IsNotEmpty()
  status!: Status;
}
