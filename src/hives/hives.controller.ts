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
  ApiConflictResponse,
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
import { CreateHiveDto } from './dto/create-hive.dto';
import { HiveFilterDto } from './dto/hive-filter.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';
import { HivesService } from './hives.service';

@ApiTags('hives')
@ApiAuthenticated()
@Controller('hives')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HivesController {
  constructor(private readonly hivesService: HivesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a hive in an apiary' })
  @ApiCreatedResponse({ description: 'Hive created' })
  @ApiConflictResponse({
    description: 'Hive code already exists in this tenant',
  })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateHiveDto) {
    return this.hivesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tenant hives with optional filters' })
  @ApiOkResponse({ description: 'Filtered tenant-scoped hive list' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll(@Query() filter: HiveFilterDto) {
    return this.hivesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a hive in the current tenant' })
  @ApiOkResponse({ description: 'Tenant-scoped hive' })
  @ApiUuidResource('Hive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.hivesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a hive in the current tenant' })
  @ApiOkResponse({ description: 'Updated hive' })
  @ApiConflictResponse({
    description: 'Hive code already exists in this tenant',
  })
  @ApiUuidResource('Hive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHiveDto) {
    return this.hivesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hive from the current tenant' })
  @ApiOkResponse({ description: 'Deleted hive' })
  @ApiUuidResource('Hive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.hivesService.remove(id);
  }
}
