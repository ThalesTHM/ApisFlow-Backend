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
import { CreateHiveDto } from './dto/create-hive.dto';
import { HiveFilterDto } from './dto/hive-filter.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { HivesService } from './hives.service';

@ApiTags('hives')
@ApiBearerAuth()
@Controller('hives')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HivesController {
  constructor(private readonly hivesService: HivesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateHiveDto) {
    return this.hivesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll(@Query() filter: HiveFilterDto) {
    return this.hivesService.findAll(filter);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.hivesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHiveDto) {
    return this.hivesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.hivesService.remove(id);
  }
}
