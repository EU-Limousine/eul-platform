import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StaffRole } from '@eul/db';

export class UserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ enum: StaffRole, enumName: 'StaffRole', isArray: true }) roles!: StaffRole[];
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) lastLoginAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class UserPageDto {
  @ApiProperty({ type: [UserDto] }) items!: UserDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password!: string;

  @ApiProperty({ enum: StaffRole, enumName: 'StaffRole', isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(StaffRole, { each: true })
  roles!: StaffRole[];
}

export class SetRolesDto {
  @ApiProperty({ enum: StaffRole, enumName: 'StaffRole', isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(StaffRole, { each: true })
  roles!: StaffRole[];
}
