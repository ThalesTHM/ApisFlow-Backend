import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductionCycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ProductionCycleFilterDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  hiveId?: string;

  @ApiPropertyOptional({ enum: ProductionCycleStatus })
  @IsOptional()
  @IsEnum(ProductionCycleStatus)
  status?: ProductionCycleStatus;
}
