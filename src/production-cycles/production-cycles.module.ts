import { Module } from '@nestjs/common';
import { ProductionCyclesController } from './production-cycles.controller';
import { ProductionCyclesService } from './production-cycles.service';

@Module({
  controllers: [ProductionCyclesController],
  providers: [ProductionCyclesService],
})
export class ProductionCyclesModule {}
