import { PartialType } from '@nestjs/swagger';
import { CreateHoneyBatchDto } from './create-honey-batch.dto';

export class UpdateHoneyBatchDto extends PartialType(CreateHoneyBatchDto) {}
