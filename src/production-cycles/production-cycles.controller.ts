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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CreateProductionCycleDto } from './dto/create-production-cycle.dto';
import { ProductionCycleFilterDto } from './dto/production-cycle-filter.dto';
import { UpdateProductionCycleDto } from './dto/update-production-cycle.dto';
import { ProductionCyclesService } from './production-cycles.service';

@ApiTags('production-cycles')
@ApiBearerAuth()
@Controller('production-cycles')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProductionCyclesController {
  constructor(private readonly cyclesService: ProductionCyclesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateProductionCycleDto) {
    return this.cyclesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll(@Query() filter: ProductionCycleFilterDto) {
    return this.cyclesService.findAll(filter);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductionCycleDto,
  ) {
    return this.cyclesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.remove(id);
  }
}
