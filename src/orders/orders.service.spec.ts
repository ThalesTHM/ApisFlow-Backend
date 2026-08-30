import { ConflictException, NotFoundException } from '@nestjs/common';
import { HoneyBatchStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { OrdersService } from './orders.service';

interface CapturedOrderCreate {
  data: {
    tenantId: string;
    total: Prisma.Decimal;
    items: {
      create: Array<{
        subtotal: Prisma.Decimal;
        honeyBatch: {
          connect: { id_tenantId: { id: string; tenantId: string } };
        };
      }>;
    };
  };
}

describe('OrdersService order and inventory flow', () => {
  const prismaMock = {
    honeyBatch: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
  };
  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(
      (callback: (transaction: typeof prismaMock) => unknown) =>
        Promise.resolve(callback(prismaMock)),
    );
    service = new OrdersService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('creates a pending order with server-calculated item subtotals and total', async () => {
    prismaMock.honeyBatch.findMany.mockResolvedValue([
      { id: '67c4e50e-ae02-45f4-9dd3-e266375b3799' },
      { id: '4fc54e04-3594-46bc-9d6e-aa596cb2a6ed' },
    ]);
    prismaMock.order.create.mockResolvedValue({});

    await service.create({
      customerName: 'Mercado Central',
      customerDocument: '12.345.678/0001-90',
      items: [
        {
          honeyBatchId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
          quantityKg: 2,
          unitPrice: 10.5,
        },
        {
          honeyBatchId: '4fc54e04-3594-46bc-9d6e-aa596cb2a6ed',
          quantityKg: 3,
          unitPrice: 20,
        },
      ],
    });

    const createArguments = prismaMock.order.create.mock.lastCall as
      [CapturedOrderCreate] | undefined;
    const createCall = createArguments?.[0];
    expect(createCall).toBeDefined();
    if (!createCall) {
      throw new Error('Expected order create arguments');
    }
    expect(createCall.data.tenantId).toBe('tenant-a');
    expect(createCall.data.total.equals(new Prisma.Decimal(81))).toBe(true);
    expect(
      createCall.data.items.create[0].subtotal.equals(new Prisma.Decimal(21)),
    ).toBe(true);
    expect(createCall.data.items.create[0].honeyBatch.connect).toEqual({
      id_tenantId: {
        id: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        tenantId: 'tenant-a',
      },
    });
  });

  it('returns tenant-scoped detail with complete traceability', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(service.findOne('order-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: { id: 'order-b', tenantId: 'tenant-a' },
      include: {
        items: {
          include: {
            honeyBatch: {
              include: {
                productionCycle: { include: { hive: true } },
              },
            },
          },
        },
      },
    });
  });

  it('confirms an order and deducts stock in one serializable transaction', async () => {
    const quantityKg = new Prisma.Decimal(5);
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-a',
      status: OrderStatus.PENDING,
      items: [{ honeyBatchId: 'batch-a', quantityKg }],
    });
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.honeyBatch.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prismaMock.order.findFirstOrThrow.mockResolvedValue({
      id: 'order-a',
      status: OrderStatus.CONFIRMED,
    });

    await service.updateStatus('order-a', {
      status: OrderStatus.CONFIRMED,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order-a',
        tenantId: 'tenant-a',
        status: OrderStatus.PENDING,
      },
      data: { status: OrderStatus.CONFIRMED },
    });
    expect(prismaMock.honeyBatch.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'batch-a',
        tenantId: 'tenant-a',
        status: HoneyBatchStatus.AVAILABLE,
        availableQuantityKg: { gte: quantityKg },
      },
      data: { availableQuantityKg: { decrement: quantityKg } },
    });
    expect(prismaMock.honeyBatch.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'batch-a',
        tenantId: 'tenant-a',
        availableQuantityKg: 0,
      },
      data: { status: HoneyBatchStatus.DEPLETED },
    });
  });

  it('prevents confirmation when stock is insufficient', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-a',
      status: OrderStatus.PENDING,
      items: [
        {
          honeyBatchId: 'batch-a',
          quantityKg: new Prisma.Decimal(50),
        },
      ],
    });
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.honeyBatch.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateStatus('order-a', { status: OrderStatus.CONFIRMED }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not allow a finalized order to change status', async () => {
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'order-a',
      status: OrderStatus.CONFIRMED,
      items: [],
    });

    await expect(
      service.updateStatus('order-a', { status: OrderStatus.CANCELLED }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.honeyBatch.updateMany).not.toHaveBeenCalled();
  });
});
