import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { ApiariesService } from './apiaries.service';

describe('ApiariesService', () => {
  const prismaMock = {
    apiary: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
  };
  const redisMock = { invalidateDashboard: jest.fn() };
  let service: ApiariesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ApiariesService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
      redisMock as unknown as RedisService,
    );
  });

  it('injects the authenticated tenant when creating an apiary', async () => {
    prismaMock.apiary.create.mockResolvedValue({});

    await service.create({ name: 'North', location: 'North field' });

    expect(prismaMock.apiary.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        name: 'North',
        location: 'North field',
      },
    });
    expect(redisMock.invalidateDashboard).toHaveBeenCalledWith('tenant-a');
  });

  it('requires latitude and longitude together', async () => {
    await expect(
      service.create({
        name: 'North',
        location: 'North field',
        latitude: -23.5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides apiaries belonging to another tenant', async () => {
    prismaMock.apiary.findFirst.mockResolvedValue(null);

    await expect(service.findOne('apiary-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.apiary.findFirst).toHaveBeenCalledWith({
      where: { id: 'apiary-b', tenantId: 'tenant-a' },
    });
  });
});
