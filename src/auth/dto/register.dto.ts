import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Honey Farm Ltd.' })
  @IsString()
  @Length(2, 100)
  tenantName: string;

  @ApiProperty({ example: 'honey-farm' })
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'jane@honeyfarm.test' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 8, maxLength: 72, writeOnly: true })
  @IsString()
  @Length(8, 72)
  password: string;
}
