import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Currency } from '@eul/db';

export class PlaceDto {
  @ApiProperty({ example: 'Copenhagen Airport (CPH), Lufthavnsboulevarden, Kastrup' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  address!: string;

  @ApiProperty({ example: 55.618 }) @Type(() => Number) @IsLatitude() lat!: number;
  @ApiProperty({ example: 12.6476 }) @Type(() => Number) @IsLongitude() lng!: number;
}

export class CreateQuoteDto {
  @ApiProperty({ type: PlaceDto }) @ValidateNested() @Type(() => PlaceDto) pickup!: PlaceDto;
  @ApiProperty({ type: PlaceDto }) @ValidateNested() @Type(() => PlaceDto) dropoff!: PlaceDto;

  @ApiProperty({ example: '2026-12-01T09:30:00Z', description: 'ISO 8601 with time zone (UTC preferred)' })
  @IsISO8601({ strict: true })
  pickupAt!: string;

  @ApiProperty({ example: 2 }) @Type(() => Number) @IsInt() @Min(1) @Max(60) passengers!: number;
}

export class QuoteCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) exampleModel!: string | null;
  @ApiProperty() maxPassengers!: number;
  @ApiPropertyOptional({ nullable: true, type: String }) luggageNote!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) description!: string | null;
}

export class QuoteOptionDto {
  @ApiProperty({ format: 'uuid' }) quoteId!: string;
  @ApiProperty({ type: QuoteCategoryDto }) category!: QuoteCategoryDto;
  @ApiProperty({ description: 'Total in minor units (øre / cents)' }) amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class QuoteResponseDto {
  @ApiProperty({ type: [QuoteOptionDto] }) options!: QuoteOptionDto[];
  @ApiProperty() distanceMeters!: number;
  @ApiProperty() durationSeconds!: number;
  @ApiProperty({ enum: ['google', 'estimate'] }) distanceSource!: 'google' | 'estimate';
}
