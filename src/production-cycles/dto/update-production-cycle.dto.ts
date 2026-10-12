import { PartialType } from '@nestjs/swagger';
import { CreateProductionCycleDto } from './create-production-cycle.dto';

export class UpdateProductionCycleDto extends PartialType(
  CreateProductionCycleDto,
) {}
