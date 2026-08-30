import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Operator' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'john@honeyfarm.test' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ minLength: 8, maxLength: 72, writeOnly: true })
  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
