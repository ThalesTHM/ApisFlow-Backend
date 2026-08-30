import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PublicUser, publicUserSelect } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly passwords: PasswordService,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const tenantId = this.tenantContext.requireTenantId();
    const passwordHash = await this.passwords.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: {
          tenantId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: dto.role,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      this.rethrowUniqueEmail(error);
    }
  }

  findAll(): Promise<PublicUser[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.user.findMany({
      where: { tenantId },
      select: publicUserSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<PublicUser> {
    const tenantId = this.tenantContext.requireTenantId();
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: publicUserSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const tenantId = this.tenantContext.requireTenantId();
    const data: Prisma.UserUpdateManyMutationInput = {
      name: dto.name,
      email: dto.email?.toLowerCase(),
      role: dto.role,
      isActive: dto.isActive,
    };
    if (dto.password) {
      data.passwordHash = await this.passwords.hash(dto.password);
    }

    try {
      const result = await this.prisma.user.updateMany({
        where: { id, tenantId },
        data,
      });
      if (result.count === 0) {
        throw new NotFoundException('User not found');
      }
      return this.findOne(id);
    } catch (error) {
      this.rethrowUniqueEmail(error);
    }
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const tenantId = this.tenantContext.requireTenantId();
    const result = await this.prisma.user.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('User not found');
    }
    return { deleted: true };
  }

  private rethrowUniqueEmail(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email is already in use in this tenant');
    }
    throw error;
  }
}
