import { Injectable } from '@nestjs/common';
import { SequenceEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface SequenceResult {
  value: number;
  formatted: string;
}

const PREFIX: Record<SequenceEntityType, string> = {
  TICKET: 'SD',
  CHANGE: 'CHG',
  PROBLEM: 'PRB',
};

@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(
    entityType: SequenceEntityType,
    companyId?: string | null,
  ): Promise<SequenceResult> {
    const year = new Date().getFullYear();

    const counter = await this.prisma.$transaction(async (tx) => {
      if (companyId) {
        return tx.sequenceCounter.upsert({
          where: {
            entityType_year_companyId: { entityType, year, companyId },
          },
          create: { entityType, year, companyId, lastValue: 1 },
          update: { lastValue: { increment: 1 } },
        });
      }
      const existing = await tx.sequenceCounter.findFirst({
        where: { entityType, year, companyId: null },
      });
      if (existing) {
        return tx.sequenceCounter.update({
          where: { id: existing.id },
          data: { lastValue: { increment: 1 } },
        });
      }
      return tx.sequenceCounter.create({
        data: { entityType, year, companyId: null, lastValue: 1 },
      });
    });

    return {
      value: counter.lastValue,
      formatted: `${PREFIX[entityType]}-${year}-${String(counter.lastValue).padStart(6, '0')}`,
    };
  }
}
