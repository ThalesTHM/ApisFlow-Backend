import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { UsersService } from './users.service';

describe('UsersService tenant isolation', () => {
  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
  };
  const passwordMock = { hash: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContextMock.requireTenantId.mockReturnValue('tenant-a');
    service = new UsersService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
      passwordMock as unknown as PasswordService,
    );
  });

  it('includes the authenticated tenant in every list query', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a' } }),
    );
  });

  it('cannot read a user that is absent from the authenticated tenant', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-from-tenant-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-from-tenant-b', tenantId: 'tenant-a' },
      }),
    );
  });

  it('injects tenantId when creating a user and never reads it from input', async () => {
    passwordMock.hash.mockResolvedValue('hashed-password');
    prismaMock.user.create.mockResolvedValue({});

    await service.create({
      name: 'Operator',
      email: 'OPERATOR@TENANT.TEST',
      password: 'plain-password',
      role: UserRole.OPERATOR,
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          tenantId: 'tenant-a',
          name: 'Operator',
          email: 'operator@tenant.test',
          passwordHash: 'hashed-password',
          role: UserRole.OPERATOR,
        },
      }),
    );
  });

  it('scopes delete mutations and hides cross-tenant records', async () => {
    prismaMock.user.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove('user-from-tenant-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
      where: { id: 'user-from-tenant-b', tenantId: 'tenant-a' },
    });
  });
});
