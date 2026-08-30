import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2026-08-30T23:30:00.000Z', format: 'date-time' })
  timestamp: string;
}

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check API health' })
  @ApiOkResponse({
    description: 'The API process is healthy',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }
}
