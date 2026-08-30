import { Module } from '@nestjs/common';
import { HivesController } from './hives.controller';
import { HivesService } from './hives.service';

@Module({
  controllers: [HivesController],
  providers: [HivesService],
})
export class HivesModule {}
