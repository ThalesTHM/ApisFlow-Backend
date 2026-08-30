import { ApiPropertyOptional } from '@nestjs/swagger';
import { ColonyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class HiveFilterDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  apiaryId?: string;

  @ApiPropertyOptional({ enum: ColonyStatus })
  @IsOptional()
  @IsEnum(ColonyStatus)
  status?: ColonyStatus;
}
