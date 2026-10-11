import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HoneyBatchStatus,
  NotificationType,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const orderDetailInclude = {
  items: {
    include: {
      honeyBatch: {
        include: {
          productionCycle: {
            include: { hive: true },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly redis: RedisService,
    private readonly activity: ActivityService,
  ) {}

  async create(dto: CreateOrderDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const batchIds = dto.items.map((item) => item.honeyBatchId);
    if (new Set(batchIds).size !== batchIds.length) {
      throw new BadRequestException(
        'An order cannot contain the same honey batch more than once',
      );
    }

    const batches = await this.prisma.honeyBatch.findMany({
      where: { tenantId, id: { in: batchIds } },
      select: { id: true },
    });
    if (batches.length !== batchIds.length) {
      throw new NotFoundException('Honey batch not found');
    }

    const items = dto.items.map((item) => ({
      honeyBatchId: item.honeyBatchId,
      quantityKg: new Prisma.Decimal(item.quantityKg),
      unitPrice: new Prisma.Decimal(item.unitPrice),
      subtotal: new Prisma.Decimal(item.quantityKg).mul(item.unitPrice),
    }));
    const total = items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0),
    );

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        customerName: dto.customerName,
        customerDocument: dto.customerDocument,
        total,
        items: {
          create: items.map((item) => ({
            honeyBatch: {
              connect: {
                id_tenantId: { id: item.honeyBatchId, tenantId },
              },
            },
            quantityKg: item.quantityKg,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: orderDetailInclude,
    });
    await this.redis.invalidateDashboard(tenantId);
    return order;
  }

  findAll() {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: orderDetailInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const tenantId = this.tenantContext.requireTenantId();
    if (dto.status === OrderStatus.PENDING) {
      throw new BadRequestException('An order cannot return to pending');
    }

    const result = await this.prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { id, tenantId },
          include: { items: true },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }
        if (order.status === dto.status) {
          return {
            order: await transaction.order.findFirstOrThrow({
              where: { id, tenantId },
              include: orderDetailInclude,
            }),
            statusChanged: false,
          };
        }
        if (order.status !== OrderStatus.PENDING) {
          throw new ConflictException('A finalized order cannot change status');
        }

        const statusUpdate = await transaction.order.updateMany({
          where: { id, tenantId, status: OrderStatus.PENDING },
          data: { status: dto.status },
        });
        if (statusUpdate.count === 0) {
          throw new ConflictException('Order status changed concurrently');
        }

        if (dto.status === OrderStatus.CONFIRMED) {
          await this.deductInventory(transaction, tenantId, order.items);
        }

        return {
          order: await transaction.order.findFirstOrThrow({
            where: { id, tenantId },
            include: orderDetailInclude,
          }),
          statusChanged: true,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.statusChanged) {
      const operations: Array<Promise<void>> = [
        this.redis.invalidateDashboard(tenantId),
      ];
      if (dto.status === OrderStatus.CONFIRMED) {
        operations.push(
          this.redis.publishDomainEvent('order.confirmed', tenantId, {
            orderId: id,
          }),
        );
      }
      await Promise.all(operations);
    }
    if (result.statusChanged && dto.status === OrderStatus.CONFIRMED) {
      await this.activity.record({
        type: NotificationType.ORDER_CONFIRMED,
        message: `Order ${id} was confirmed`,
        action: 'order.confirmed',
        entity: 'Order',
        entityId: id,
        metadata: { total: result.order.total.toNumber() },
      });
    }
    return result.order;
  }

  private async deductInventory(
    transaction: Prisma.TransactionClient,
    tenantId: string,
    items: Array<{ honeyBatchId: string; quantityKg: Prisma.Decimal }>,
  ): Promise<void> {
    for (const item of items) {
      const deduction = await transaction.honeyBatch.updateMany({
        where: {
          id: item.honeyBatchId,
          tenantId,
          status: HoneyBatchStatus.AVAILABLE,
          availableQuantityKg: { gte: item.quantityKg },
        },
        data: {
          availableQuantityKg: { decrement: item.quantityKg },
        },
      });
      if (deduction.count === 0) {
        throw new ConflictException(
          'Insufficient or unavailable honey batch stock',
        );
      }

      await transaction.honeyBatch.updateMany({
        where: {
          id: item.honeyBatchId,
          tenantId,
          availableQuantityKg: 0,
        },
        data: { status: HoneyBatchStatus.DEPLETED },
      });
    }
  }
}
