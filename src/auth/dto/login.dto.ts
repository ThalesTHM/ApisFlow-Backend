import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'honey-farm' })
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug: string;

  @ApiProperty({ example: 'jane@honeyfarm.test' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  password: string;
}
