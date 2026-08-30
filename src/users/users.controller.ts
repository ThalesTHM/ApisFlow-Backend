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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiAuthenticated()
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user in the current tenant' })
  @ApiCreatedResponse({ description: 'User created without password data' })
  @ApiConflictResponse({ description: 'Email already exists in this tenant' })
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users in the current tenant' })
  @ApiOkResponse({ description: 'Tenant-scoped user list' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user in the current tenant' })
  @ApiOkResponse({ description: 'Tenant-scoped user' })
  @ApiUuidResource('User')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user in the current tenant' })
  @ApiOkResponse({ description: 'Updated user without password data' })
  @ApiConflictResponse({ description: 'Email already exists in this tenant' })
  @ApiUuidResource('User')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user from the current tenant' })
  @ApiOkResponse({ description: 'Deleted user' })
  @ApiUuidResource('User')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
