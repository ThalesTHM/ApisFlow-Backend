import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateHoneyBatchDto } from './dto/create-honey-batch.dto';
import { UpdateHoneyBatchDto } from './dto/update-honey-batch.dto';
import { HoneyBatchesService } from './honey-batches.service';

@ApiTags('honey-batches')
@ApiAuthenticated()
@Controller('honey-batches')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HoneyBatchesController {
  constructor(private readonly honeyBatchesService: HoneyBatchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a traceable honey batch' })
  @ApiCreatedResponse({
    description: 'Honey batch created with available stock',
  })
  @ApiConflictResponse({
    description: 'Batch code already exists in this tenant',
  })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateHoneyBatchDto) {
    return this.honeyBatchesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List honey batches in the current tenant' })
  @ApiOkResponse({ description: 'Tenant-scoped honey batch list' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll() {
    return this.honeyBatchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a honey batch and production traceability' })
  @ApiOkResponse({ description: 'Tenant-scoped honey batch detail' })
  @ApiUuidResource('Honey batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.honeyBatchesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a honey batch' })
  @ApiOkResponse({ description: 'Updated honey batch' })
  @ApiConflictResponse({
    description: 'Batch code already exists in this tenant',
  })
  @ApiUuidResource('Honey batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHoneyBatchDto,
  ) {
    return this.honeyBatchesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a honey batch' })
  @ApiOkResponse({ description: 'Deleted honey batch' })
  @ApiUuidResource('Honey batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.honeyBatchesService.remove(id);
  }
}
