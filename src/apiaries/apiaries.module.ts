import { Module } from '@nestjs/common';
import { ApiariesController } from './apiaries.controller';
import { ApiariesService } from './apiaries.service';

@Module({
  controllers: [ApiariesController],
  providers: [ApiariesService],
})
export class ApiariesModule {}
