import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Currency, Prisma } from '@eul/db';
import { AuditService } from '../audit/audit.service';
import { rethrowUnique } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePricingRuleDto, PricingRuleDto, UpdatePricingRuleDto } from './dto/pricing.dto';
import { calculatePrice, type PriceBreakdown } from './price-calculator';

type RuleRow = Prisma.PricingRuleGetPayload<{ include: { category: true } }>;

function toDto(r: RuleRow): PricingRuleDto {
  return {
    id: r.id,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    currency: r.currency,
    baseFareMinor: r.baseFareMinor,
    perKmMinor: r.perKmMinor,
    perMinuteMinor: r.perMinuteMinor,
    minimumFareMinor: r.minimumFareMinor,
    isActive: r.isActive,
    isConfirmed: r.isConfirmed,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function amounts(r: { baseFareMinor: number; perKmMinor: number; perMinuteMinor: number; minimumFareMinor: number; isActive: boolean; isConfirmed: boolean }) {
  return {
    baseFareMinor: r.baseFareMinor,
    perKmMinor: r.perKmMinor,
    perMinuteMinor: r.perMinuteMinor,
    minimumFareMinor: r.minimumFareMinor,
    isActive: r.isActive,
    isConfirmed: r.isConfirmed,
  };
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<PricingRuleDto[]> {
    const rows = await this.prisma.db.pricingRule.findMany({
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { currency: 'asc' }],
    });
    return rows.map(toDto);
  }

  async create(actorId: string, dto: CreatePricingRuleDto, requestId: string): Promise<PricingRuleDto> {
    const category = await this.prisma.db.vehicleCategory.count({ where: { id: dto.categoryId } });
    if (!category) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        fieldErrors: { categoryId: ['Vehicle category does not exist.'] },
      });
    }
    try {
      const row = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.pricingRule.create({ data: dto, include: { category: true } });
        await this.audit.log(
          { actorId, action: 'pricing.rule.create', entityType: 'pricingRule', entityId: created.id, after: { ...dto }, requestId },
          tx,
        );
        return created;
      });
      return toDto(row);
    } catch (error) {
      rethrowUnique(error, 'PRICING_RULE_EXISTS', 'This category already has a price in this currency.');
    }
  }

  /** Price changes affect new quotes only; bookings keep their own price snapshot. */
  async update(actorId: string, id: string, dto: UpdatePricingRuleDto, requestId: string): Promise<PricingRuleDto> {
    const before = await this.prisma.db.pricingRule.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'PRICING_RULE_NOT_FOUND', message: 'Pricing rule not found.' });

    const row = await this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.pricingRule.update({ where: { id }, data: dto, include: { category: true } });
      await this.audit.log(
        { actorId, action: 'pricing.rule.update', entityType: 'pricingRule', entityId: id, before: amounts(before), after: amounts(updated), requestId },
        tx,
      );
      return updated;
    });
    return toDto(row);
  }

  /** Dashboard preview: what would this rule charge for a given trip? */
  async preview(id: string, distanceMeters: number, durationSeconds: number): Promise<PriceBreakdown> {
    const rule = await this.prisma.db.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException({ code: 'PRICING_RULE_NOT_FOUND', message: 'Pricing rule not found.' });
    return calculatePrice(rule, distanceMeters, durationSeconds);
  }

  /** Used by quotes: the active rule for a category in a currency, or null. */
  findActiveRule(categoryId: string, currency: Currency) {
    return this.prisma.db.pricingRule.findFirst({ where: { categoryId, currency, isActive: true } });
  }
}
