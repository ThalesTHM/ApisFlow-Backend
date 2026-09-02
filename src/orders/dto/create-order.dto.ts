import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  honeyBatchId: string;

  @ApiProperty({ example: 5.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantityKg: number;

  @ApiProperty({ example: 24.9, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Mercado Central' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  customerName: string;

  @ApiPropertyOptional({ example: '+1 555-123-4567' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  customerPhone?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: CreateOrderItemDto) => item.honeyBatchId)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
