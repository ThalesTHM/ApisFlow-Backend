import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ColonyStatus, QueenStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateHiveDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  apiaryId: string;

  @ApiProperty({ example: 'HIVE-001' })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiPropertyOptional({ enum: QueenStatus, default: QueenStatus.UNKNOWN })
  @IsOptional()
  @IsEnum(QueenStatus)
  queenStatus?: QueenStatus;

  @ApiPropertyOptional({ enum: ColonyStatus, default: ColonyStatus.MODERATE })
  @IsOptional()
  @IsEnum(ColonyStatus)
  colonyStatus?: ColonyStatus;

  @ApiProperty({ example: '2026-08-30', format: 'date' })
  @IsDateString({ strict: true })
  installationDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
