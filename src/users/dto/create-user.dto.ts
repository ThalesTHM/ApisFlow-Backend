import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Length, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Operator' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'john@honeyfarm.test' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 72, writeOnly: true })
  @IsString()
  @Length(8, 72)
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.OPERATOR })
  @IsEnum(UserRole)
  role: UserRole = UserRole.OPERATOR;
}
