import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CheckoutStatus, Currency } from '@eul/db';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const PHONE = /^\+?[0-9 ()-]{6,20}$/;
// Website languages (D-16). Keep in sync with @eul/i18n LOCALES.
const LANGUAGES = ['en', 'da', 'de', 'fr', 'es', 'it', 'rm'] as const;

export class CheckoutCustomerDto {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty() @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ example: '+45 12 34 56 78' }) @Transform(trim) @Matches(PHONE) phone!: string;
}

export class CreateCheckoutDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() quoteId!: string;

  @ApiProperty({ type: CheckoutCustomerDto })
  @ValidateNested()
  @Type(() => CheckoutCustomerDto)
  customer!: CheckoutCustomerDto;

  @ApiPropertyOptional({ description: 'If someone else travels' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  passengerName?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim) @Matches(PHONE) passengerPhone?: string;

  @ApiPropertyOptional({ example: 'SK1234' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '') : value))
  @Matches(/^[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?$/, { message: 'Flight number looks invalid (e.g. SK1234).' })
  flightNumber?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) notes?: string;

  @ApiProperty({ enum: LANGUAGES }) @IsIn(LANGUAGES) language!: (typeof LANGUAGES)[number];
}

export class CheckoutCreatedDto {
  @ApiProperty({ format: 'uuid' }) checkoutId!: string;
  @ApiPropertyOptional({ description: 'Send the customer here to pay' }) redirectUrl?: string;
  @ApiPropertyOptional({ description: 'For providers with an embedded widget' }) clientToken?: string;
}

export class CheckoutStatusDto {
  @ApiProperty({ format: 'uuid' }) checkoutId!: string;
  @ApiProperty({ enum: CheckoutStatus, enumName: 'CheckoutStatus' }) status!: CheckoutStatus;
  @ApiPropertyOptional({ nullable: true, type: String, description: 'Set once the payment is confirmed' })
  bookingReference!: string | null;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty({ format: 'date-time' }) pickupAt!: string;
  @ApiProperty() pickupAddress!: string;
  @ApiProperty() dropoffAddress!: string;
  @ApiProperty() categoryName!: string;
}
