import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductionCycleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductionCycleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hiveId: string;

  @ApiProperty({ example: '2026-09-01', format: 'date' })
  @IsDateString({ strict: true })
  startDate: string;

  @ApiPropertyOptional({ example: '2026-12-01', format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @ApiPropertyOptional({
    enum: ProductionCycleStatus,
    default: ProductionCycleStatus.PLANNED,
  })
  @IsOptional()
  @IsEnum(ProductionCycleStatus)
  status?: ProductionCycleStatus;

  @ApiPropertyOptional({ example: 25.5, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedProductionKg?: number;

  @ApiPropertyOptional({ example: 22.75, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualProductionKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
