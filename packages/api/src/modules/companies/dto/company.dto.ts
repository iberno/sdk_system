import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Status } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Empresa X' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '12.345.678/0001-90', description: 'CNPJ válido (14 dígitos)' })
  @IsString()
  @IsNotEmpty()
  cnpj!: string;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Empresa X' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  cnpj?: string;
}

export class UpdateCompanyStatusDto {
  @ApiProperty({ enum: Status })
  @IsEnum(Status)
  @IsNotEmpty()
  status!: Status;
}

export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (new Set(digits).size === 1) return false;

  const calcDigit = (base: string): number => {
    const weights = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base
      .split('')
      .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(digits.slice(0, 12));
  if (Number(digits[12]) !== d1) return false;
  const d2 = calcDigit(digits.slice(0, 13));
  return Number(digits[13]) === d2;
}