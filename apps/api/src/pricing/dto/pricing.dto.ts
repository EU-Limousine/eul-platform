import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Currency } from '@eul/db';

// Upper bound guards against typos (e.g. 1,000,000.00 entered as minor units).
const MAX_MINOR = 100_000_000;

export class PricingRuleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty() categoryName!: string;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty({ description: 'Minor units (øre / cents)' }) baseFareMinor!: number;
  @ApiProperty({ description: 'Minor units per km' }) perKmMinor!: number;
  @ApiProperty({ description: 'Minor units per minute' }) perMinuteMinor!: number;
  @ApiProperty({ description: 'Minor units' }) minimumFareMinor!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: 'False until management confirms prices (D-06)' }) isConfirmed!: boolean;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class CreatePricingRuleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId!: string;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) @IsEnum(Currency) currency!: Currency;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_MINOR) baseFareMinor!: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_MINOR) perKmMinor?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_MINOR) perMinuteMinor?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_MINOR) minimumFareMinor?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isConfirmed?: boolean;
}

/** Category and currency are fixed once a rule exists; create a new rule instead. */
export class UpdatePricingRuleDto extends PartialType(OmitType(CreatePricingRuleDto, ['categoryId', 'currency'] as const)) {}

export class PricePreviewQueryDto {
  @ApiProperty({ description: 'Distance in metres' }) @Type(() => Number) @IsInt() @Min(0) @Max(2_000_000) distanceMeters!: number;
  @ApiProperty({ description: 'Duration in seconds' }) @Type(() => Number) @IsInt() @Min(0) @Max(172_800) durationSeconds!: number;
}

export class PriceBreakdownDto {
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty() distanceMeters!: number;
  @ApiProperty() durationSeconds!: number;
  @ApiProperty() baseFareMinor!: number;
  @ApiProperty() distanceMinor!: number;
  @ApiProperty() timeMinor!: number;
  @ApiProperty() subtotalMinor!: number;
  @ApiProperty() minimumFareMinor!: number;
  @ApiProperty() minimumApplied!: boolean;
  @ApiProperty() totalMinor!: number;
}
