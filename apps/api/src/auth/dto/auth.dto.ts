import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { StaffRole } from '@eul/db';
import { PERMISSIONS, type Permission, type StaffApp } from '../permissions';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;

  @ApiProperty({ enum: ['dashboard', 'driver'] })
  @IsIn(['dashboard', 'driver'])
  app!: StaffApp;
}

export class MeDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: StaffRole, enumName: 'StaffRole', isArray: true }) roles!: StaffRole[];
  @ApiProperty({ enum: PERMISSIONS, enumName: 'Permission', isArray: true }) permissions!: Permission[];
}

export class TokenResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ description: 'Seconds until the access token expires' }) expiresIn!: number;
  @ApiProperty({ type: MeDto }) user!: MeDto;
}
