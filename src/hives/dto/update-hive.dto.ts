import { PartialType } from '@nestjs/swagger';
import { CreateHiveDto } from './create-hive.dto';

export class UpdateHiveDto extends PartialType(CreateHiveDto) {}
