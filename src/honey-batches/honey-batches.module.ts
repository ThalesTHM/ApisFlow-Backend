import { Module } from '@nestjs/common';
import { HoneyBatchesController } from './honey-batches.controller';
import { HoneyBatchesService } from './honey-batches.service';

@Module({
  controllers: [HoneyBatchesController],
  providers: [HoneyBatchesService],
})
export class HoneyBatchesModule {}
