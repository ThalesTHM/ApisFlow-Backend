import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  })
  @IsIn([OrderStatus.CONFIRMED, OrderStatus.CANCELLED])
  status: OrderStatus;
}
