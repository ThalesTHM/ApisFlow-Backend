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
import { ApiariesService } from './apiaries.service';
import { CreateApiaryDto } from './dto/create-apiary.dto';
import { UpdateApiaryDto } from './dto/update-apiary.dto';

@ApiTags('apiaries')
@ApiAuthenticated()
@Controller('apiaries')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ApiariesController {
  constructor(private readonly apiariesService: ApiariesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an apiary in the current tenant' })
  @ApiCreatedResponse({ description: 'Apiary created' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateApiaryDto) {
    return this.apiariesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List apiaries in the current tenant' })
  @ApiOkResponse({ description: 'Tenant-scoped apiary list' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll() {
    return this.apiariesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an apiary in the current tenant' })
  @ApiOkResponse({ description: 'Tenant-scoped apiary' })
  @ApiUuidResource('Apiary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiariesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an apiary in the current tenant' })
  @ApiOkResponse({ description: 'Updated apiary' })
  @ApiUuidResource('Apiary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateApiaryDto) {
    return this.apiariesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an apiary from the current tenant' })
  @ApiOkResponse({ description: 'Deleted apiary' })
  @ApiUuidResource('Apiary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiariesService.remove(id);
  }
}
