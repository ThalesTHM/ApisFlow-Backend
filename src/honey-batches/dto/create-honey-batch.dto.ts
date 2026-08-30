import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HoneyBatchStatus, HoneyQuality } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

export class CreateHoneyBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productionCycleId: string;

  @ApiProperty({ example: 'BATCH-2026-001' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: '2026-08-30', format: 'date' })
  @IsDateString({ strict: true })
  productionDate: string;

  @ApiProperty({ example: 25.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantityKg: number;

  @ApiProperty({ enum: HoneyQuality })
  @IsEnum(HoneyQuality)
  quality: HoneyQuality;

  @ApiPropertyOptional({
    enum: HoneyBatchStatus,
    default: HoneyBatchStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(HoneyBatchStatus)
  status?: HoneyBatchStatus;
}
