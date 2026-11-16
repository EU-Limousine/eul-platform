import { Controller, Get, Injectable, Query } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEnum, IsOptional } from 'class-validator';
import { Currency } from '@eul/db';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class PublicCategoriesQueryDto {
  @ApiPropertyOptional({ enum: Currency, enumName: 'Currency' }) @IsOptional() @IsEnum(Currency) currency?: Currency;
}

export class PublicCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) exampleModel!: string | null;
  @ApiProperty() maxPassengers!: number;
  @ApiPropertyOptional({ nullable: true, type: String }) luggageNote!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) description!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number, description: 'Minimum fare in minor units — only when the price is CONFIRMED' })
  fromPriceMinor!: number | null;
  @ApiPropertyOptional({ enum: Currency, enumName: 'Currency', nullable: true }) currency!: Currency | null;
}

/**
 * Active vehicle classes for the website (fleet section). A "from" price is shown only
 * for prices management has marked as confirmed — never an unconfirmed or invented price.
 */
@Injectable()
export class PublicCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currency?: Currency): Promise<PublicCategoryDto[]> {
    const rows = await this.prisma.db.vehicleCategory.findMany({
      where: { isActive: true },
      include: { pricingRules: { where: { isActive: true, isConfirmed: true, ...(currency ? { currency } : {}) } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((c) => {
      const rule = c.pricingRules[0];
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        exampleModel: c.exampleModel,
        maxPassengers: c.maxPassengers,
        luggageNote: c.luggageNote,
        description: c.description,
        fromPriceMinor: rule ? rule.minimumFareMinor || rule.baseFareMinor : null,
        currency: rule?.currency ?? null,
      };
    });
  }
}

@ApiTags('public')
@Public()
@Controller('public/vehicle-categories')
export class PublicCategoriesController {
  constructor(private readonly service: PublicCategoriesService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOkResponse({ type: [PublicCategoryDto] })
  list(@Query() query: PublicCategoriesQueryDto): Promise<PublicCategoryDto[]> {
    return this.service.list(query.currency);
  }
}
