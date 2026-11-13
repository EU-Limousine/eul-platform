import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DriverType } from '@eul/db';
import { PageQueryDto } from '../../common/page-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

// International phone: optional +, digits, spaces, dashes. 6–20 chars.
const PHONE = /^\+?[0-9 ()-]{6,20}$/;

export class DriverVehicleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() make!: string;
  @ApiProperty() model!: string;
  @ApiProperty() plate!: string;
  @ApiProperty() categoryName!: string;
}

export class DriverDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ description: 'Work phone, shared with customers on confirmation' }) workPhone!: string;
  @ApiProperty({ enum: DriverType, enumName: 'DriverType' }) driverType!: DriverType;
  @ApiProperty({ description: 'Driver profile active' }) isActive!: boolean;
  @ApiProperty({ description: 'Login account active' }) userIsActive!: boolean;
  @ApiProperty({ description: 'On duty' }) isAvailable!: boolean;
  @ApiPropertyOptional({ type: DriverVehicleDto, nullable: true }) vehicle!: DriverVehicleDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class DriverPageDto {
  @ApiProperty({ type: [DriverDto] }) items!: DriverDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class DriverQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search name, email or phone' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;
}

/** Creates the login account (role DRIVER) and the driver profile together. */
export class CreateDriverDto {
  @ApiProperty() @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty({ minLength: 12 }) @IsString() @MinLength(12) @MaxLength(200) password!: string;
  @ApiProperty({ example: '+45 12 34 56 78' }) @Transform(trim) @Matches(PHONE) workPhone!: string;

  @ApiPropertyOptional({ enum: DriverType, enumName: 'DriverType', default: DriverType.EMPLOYEE })
  @IsOptional()
  @IsEnum(DriverType)
  driverType?: DriverType;

  @ApiPropertyOptional({ format: 'uuid', description: 'Default vehicle' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}

export class UpdateDriverDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @Matches(PHONE) workPhone?: string;
  @ApiPropertyOptional({ enum: DriverType, enumName: 'DriverType' }) @IsOptional() @IsEnum(DriverType) driverType?: DriverType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String, description: 'null removes the default vehicle' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUUID()
  vehicleId?: string | null;

  @ApiPropertyOptional({ description: 'Deactivated drivers get no offers' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
