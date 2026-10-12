import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  ApiAuthenticated,
  ApiUuidResource,
} from '../common/swagger/api-documentation.decorators';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CreateProductionCycleDto } from './dto/create-production-cycle.dto';
import { ProductionCycleFilterDto } from './dto/production-cycle-filter.dto';
import { UpdateProductionCycleDto } from './dto/update-production-cycle.dto';
import { ProductionCyclesService } from './production-cycles.service';

@ApiTags('production-cycles')
@ApiAuthenticated()
@Controller('production-cycles')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProductionCyclesController {
  constructor(private readonly cyclesService: ProductionCyclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a production cycle for a hive' })
  @ApiCreatedResponse({ description: 'Production cycle created' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateProductionCycleDto) {
    return this.cyclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List production cycles with optional filters' })
  @ApiOkResponse({
    description: 'Filtered tenant-scoped production cycle list',
  })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll(@Query() filter: ProductionCycleFilterDto) {
    return this.cyclesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a production cycle in the current tenant' })
  @ApiOkResponse({ description: 'Production cycle with hive traceability' })
  @ApiUuidResource('Production cycle')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a production cycle' })
  @ApiOkResponse({ description: 'Updated production cycle' })
  @ApiUuidResource('Production cycle')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductionCycleDto,
  ) {
    return this.cyclesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a production cycle' })
  @ApiOkResponse({ description: 'Deleted production cycle' })
  @ApiUuidResource('Production cycle')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.remove(id);
  }
}
