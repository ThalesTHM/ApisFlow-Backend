import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiAuthenticated } from '../common/swagger/api-documentation.decorators';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import { TenantGuard } from '../tenancy/tenant.guard';
import { AuthResult, AuthService, PublicUser } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AccessTokenPayload } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a tenant and its initial administrator' })
  @ApiCreatedResponse({
    description: 'Tenant registered and access token issued',
  })
  @ApiConflictResponse({ description: 'Tenant slug is already in use' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate within a tenant' })
  @ApiOkResponse({
    description: 'Credentials accepted and access token issued',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid tenant or credentials' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiAuthenticated()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ description: 'Current active tenant user' })
  @UseGuards(JwtAuthGuard, TenantGuard)
  me(
    @CurrentUser() user: AccessTokenPayload,
    @CurrentTenant() tenantId: string,
  ): Promise<PublicUser> {
    return this.authService.me(user.sub, tenantId);
  }
}
