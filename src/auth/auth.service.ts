import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export const publicUserSelect = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
  tenant: { id: string; name: string; slug: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(dto.password);
    const email = dto.email.toLowerCase();

    try {
      const { tenant, user } = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: dto.tenantName, slug: dto.tenantSlug },
          select: { id: true, name: true, slug: true },
        });
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: dto.name,
            email,
            passwordHash,
            role: UserRole.ADMIN,
          },
          select: publicUserSelect,
        });

        return { tenant, user };
      });

      return {
        accessToken: await this.issueToken(user),
        tenant,
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Tenant slug is already in use');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userWithPassword = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: dto.email.toLowerCase(),
        isActive: true,
      },
    });
    if (
      !userWithPassword ||
      !(await this.passwords.compare(
        dto.password,
        userWithPassword.passwordHash,
      ))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user: PublicUser = {
      id: userWithPassword.id,
      tenantId: userWithPassword.tenantId,
      name: userWithPassword.name,
      email: userWithPassword.email,
      role: userWithPassword.role,
      isActive: userWithPassword.isActive,
      createdAt: userWithPassword.createdAt,
      updatedAt: userWithPassword.updatedAt,
    };
    return {
      accessToken: await this.issueToken(user),
      tenant,
      user,
    };
  }

  async me(userId: string, tenantId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: publicUserSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private issueToken(user: PublicUser): Promise<string> {
    return this.tokens.issueAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      roles: [user.role],
    });
  }
}
