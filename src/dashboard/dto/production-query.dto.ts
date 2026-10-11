import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ProductionPeriod {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export class ProductionQueryDto {
  @ApiPropertyOptional({
    enum: ProductionPeriod,
    default: ProductionPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(ProductionPeriod)
  period: ProductionPeriod = ProductionPeriod.MONTH;
}
