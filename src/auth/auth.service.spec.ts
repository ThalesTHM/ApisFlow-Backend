import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthService, PublicUser } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  const tenant = { id: 'tenant-a', name: 'Tenant A', slug: 'tenant-a' };
  const user: PublicUser = {
    id: 'user-a',
    tenantId: tenant.id,
    name: 'Admin User',
    email: 'admin@tenant.test',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const prismaMock = {
    tenant: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const passwordMock = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const tokenMock = {
    issueAccessToken: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prismaMock as unknown as PrismaService,
      passwordMock,
      tokenMock as unknown as TokenService,
    );
  });

  it('creates a tenant and its initial admin with a hashed password', async () => {
    passwordMock.hash.mockResolvedValue('hashed-password');
    tokenMock.issueAccessToken.mockResolvedValue('access-token');
    prismaMock.tenant.create.mockResolvedValue(tenant);
    prismaMock.user.create.mockResolvedValue(user);
    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof prismaMock) => Promise<unknown>) =>
        callback(prismaMock),
    );

    const result = await service.register({
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      name: user.name,
      email: 'ADMIN@TENANT.TEST',
      password: 'plain-password',
    });

    expect(passwordMock.hash).toHaveBeenCalledWith('plain-password');
    expect(prismaMock.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: tenant.name, slug: tenant.slug },
      }),
    );
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: tenant.id,
          email: user.email,
          passwordHash: 'hashed-password',
          role: UserRole.ADMIN,
        }) as object,
      }),
    );
    expect(tokenMock.issueAccessToken).toHaveBeenCalledWith({
      sub: user.id,
      tenantId: tenant.id,
      roles: [UserRole.ADMIN],
    });
    expect(result.accessToken).toBe('access-token');
  });

  it('scopes login user lookup to the tenant resolved by slug', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant);
    prismaMock.user.findFirst.mockResolvedValue({
      ...user,
      passwordHash: 'hashed-password',
    });
    passwordMock.compare.mockResolvedValue(true);
    tokenMock.issueAccessToken.mockResolvedValue('access-token');

    await service.login({
      tenantSlug: tenant.slug,
      email: 'ADMIN@TENANT.TEST',
      password: 'plain-password',
    });

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: tenant.id,
        email: user.email,
        isActive: true,
      },
    });
  });

  it('rejects an invalid password', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenant);
    prismaMock.user.findFirst.mockResolvedValue({
      ...user,
      passwordHash: 'hashed-password',
    });
    passwordMock.compare.mockResolvedValue(false);

    await expect(
      service.login({
        tenantSlug: tenant.slug,
        email: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenMock.issueAccessToken).not.toHaveBeenCalled();
  });
});
