import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/page-query.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// ───────── Categories ─────────

export class VehicleCategoryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) exampleModel!: string | null;
  @ApiProperty() maxPassengers!: number;
  @ApiPropertyOptional({ nullable: true, type: String }) luggageNote!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) description!: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: 'False until management confirms real fleet data (D-09)' }) isConfirmed!: boolean;
  @ApiProperty() vehicleCount!: number;
}

export class CreateVehicleCategoryDto {
  @ApiProperty({ example: 'BUSINESS', description: 'Upper case letters, digits and _' })
  @Transform(trim)
  @Matches(/^[A-Z0-9_]{2,40}$/)
  code!: string;

  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) name!: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(80) exampleModel?: string;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(100) maxPassengers!: number;

  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(120) luggageNote?: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(500) description?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isConfirmed?: boolean;
}

export class UpdateVehicleCategoryDto extends PartialType(CreateVehicleCategoryDto) {}

// ───────── Vehicles ─────────

export class VehicleDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty() categoryName!: string;
  @ApiProperty() make!: string;
  @ApiProperty() model!: string;
  @ApiProperty() plate!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) color!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() isConfirmed!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class VehiclePageDto {
  @ApiProperty({ type: [VehicleDto] }) items!: VehicleDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class VehicleQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by active state' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search plate, make or model' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;
}

export class CreateVehicleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId!: string;
  @ApiProperty({ example: 'Mercedes-Benz' }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) make!: string;
  @ApiProperty({ example: 'E-Class' }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) model!: string;

  @ApiProperty({ description: 'Stored upper case without extra spaces' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, ' ') : value))
  @IsString()
  @MinLength(2)
  @MaxLength(15)
  plate!: string;

  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(40) color?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isConfirmed?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(500) notes?: string;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
