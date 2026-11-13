import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  AssignmentMethod,
  BookingStatus,
  BookingType,
  Currency,
  PaymentStatus,
} from '@eul/db';
import { PageQueryDto } from '../../common/page-query.dto';

const splitList = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value;

// ───────── List ─────────

export class BookingQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Comma-separated statuses, e.g. NEW,NEEDS_ATTENTION', type: String })
  @IsOptional()
  @Transform(splitList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(BookingStatus, { each: true })
  status?: BookingStatus[];

  @ApiPropertyOptional({ enum: BookingType, enumName: 'BookingType' })
  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;

  @ApiPropertyOptional({ description: 'Pickup from (ISO 8601, inclusive)' }) @IsOptional() @IsISO8601({ strict: true }) from?: string;
  @ApiPropertyOptional({ description: 'Pickup before (ISO 8601, exclusive)' }) @IsOptional() @IsISO8601({ strict: true }) to?: string;

  @ApiPropertyOptional({ description: 'Reference, customer name or email' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['pickupAt', '-pickupAt', 'createdAt', '-createdAt'], default: 'pickupAt' })
  @IsOptional()
  @IsIn(['pickupAt', '-pickupAt', 'createdAt', '-createdAt'])
  sort?: 'pickupAt' | '-pickupAt' | 'createdAt' | '-createdAt';
}

export class BookingListItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' }) status!: BookingStatus;
  @ApiProperty({ enum: BookingType, enumName: 'BookingType' }) type!: BookingType;
  @ApiProperty({ format: 'date-time' }) pickupAt!: string;
  @ApiProperty() pickupAddress!: string;
  @ApiProperty() dropoffAddress!: string;
  @ApiProperty() categoryName!: string;
  @ApiProperty() passengers!: number;
  @ApiProperty() customerName!: string;
  @ApiProperty() priceMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiPropertyOptional({ nullable: true, type: String }) driverName!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class BookingPageDto {
  @ApiProperty({ type: [BookingListItemDto] }) items!: BookingListItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

// ───────── Detail ─────────

export class BookingCustomerDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) phone!: string | null;
}

export class BookingPaymentDto {
  @ApiProperty() provider!: string;
  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' }) status!: PaymentStatus;
  @ApiProperty() amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class AssignmentDriverDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() workPhone!: string;
}

export class AssignmentVehicleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() make!: string;
  @ApiProperty() model!: string;
  @ApiProperty() plate!: string;
}

export class BookingAssignmentDto {
  @ApiProperty({ type: AssignmentDriverDto }) driver!: AssignmentDriverDto;
  @ApiPropertyOptional({ type: AssignmentVehicleDto, nullable: true }) vehicle!: AssignmentVehicleDto | null;
  @ApiProperty({ enum: AssignmentMethod, enumName: 'AssignmentMethod' }) method!: AssignmentMethod;
  @ApiPropertyOptional({ nullable: true, type: String }) assignedByName!: string | null;
  @ApiProperty({ format: 'date-time' }) assignedAt!: string;
}

export class StatusHistoryItemDto {
  @ApiPropertyOptional({ enum: BookingStatus, enumName: 'BookingStatus', nullable: true }) fromStatus!: BookingStatus | null;
  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' }) toStatus!: BookingStatus;
  @ApiPropertyOptional({ nullable: true, type: String }) actorName!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class BookingDetailDto extends BookingListItemDto {
  @ApiProperty({ type: BookingCustomerDto }) customer!: BookingCustomerDto;
  @ApiPropertyOptional({ nullable: true, type: String }) passengerName!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) passengerPhone!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) flightNumber!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty() language!: string;
  @ApiProperty({ description: 'Price snapshot taken at booking', type: Object }) priceBreakdown!: Record<string, unknown>;
  @ApiProperty() pickupLat!: number;
  @ApiProperty() pickupLng!: number;
  @ApiProperty() dropoffLat!: number;
  @ApiProperty() dropoffLng!: number;
  @ApiPropertyOptional({ type: BookingPaymentDto, nullable: true }) payment!: BookingPaymentDto | null;
  @ApiPropertyOptional({ type: BookingAssignmentDto, nullable: true }) assignment!: BookingAssignmentDto | null;
  @ApiProperty({ type: [StatusHistoryItemDto] }) history!: StatusHistoryItemDto[];
}

// ───────── Assignment ─────────

export class AssignDriverDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() driverId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: "Defaults to the driver's own vehicle" })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class DriverCandidateDto {
  @ApiProperty({ format: 'uuid' }) driverId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() workPhone!: string;
  @ApiProperty({ description: 'On duty right now' }) isAvailable!: boolean;
  @ApiProperty({ description: "On the spare list for the booking's date" }) isSpare!: boolean;
  @ApiPropertyOptional({ type: AssignmentVehicleDto, nullable: true }) vehicle!: AssignmentVehicleDto | null;
  @ApiPropertyOptional({ nullable: true, type: String }) vehicleCategoryName!: string | null;
  @ApiProperty({ description: "Driver's vehicle is in the booked category" }) categoryMatches!: boolean;
  @ApiProperty({ description: "Driver's vehicle seats the passengers" }) fitsPassengers!: boolean;
  @ApiProperty({ description: 'Other active trips on the same date' }) tripsSameDay!: number;
}
