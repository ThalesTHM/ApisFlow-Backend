import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HoneyBatch,
  HoneyBatchStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { CreateHoneyBatchDto } from './dto/create-honey-batch.dto';
import { UpdateHoneyBatchDto } from './dto/update-honey-batch.dto';

@Injectable()
export class HoneyBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly redis: RedisService,
    private readonly activity: ActivityService,
  ) {}

  async create(dto: CreateHoneyBatchDto): Promise<HoneyBatch> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.requireProductionCycle(dto.productionCycleId, tenantId);
    if (dto.status === HoneyBatchStatus.DEPLETED) {
      throw new BadRequestException('A new honey batch cannot be depleted');
    }

    try {
      const batch = await this.prisma.honeyBatch.create({
        data: {
          tenantId,
          productionCycleId: dto.productionCycleId,
          code: dto.code,
          productionDate: new Date(dto.productionDate),
          quantityKg: dto.quantityKg,
          availableQuantityKg: dto.quantityKg,
          quality: dto.quality,
          status: dto.status,
        },
      });
      await Promise.all([
        this.redis.invalidateDashboard(tenantId),
        this.redis.publishDomainEvent('honey-batch.created', tenantId, {
          honeyBatchId: batch.id,
          productionCycleId: batch.productionCycleId,
        }),
      ]);
      await this.activity.record({
        type: NotificationType.HONEY_BATCH_CREATED,
        message: `Honey batch ${batch.code} was created`,
        action: 'honey-batch.created',
        entity: 'HoneyBatch',
        entityId: batch.id,
        metadata: {
          code: batch.code,
          productionCycleId: batch.productionCycleId,
          quantityKg: batch.quantityKg.toNumber(),
        },
      });
      return batch;
    } catch (error) {
      this.rethrowPersistenceError(error);
    }
  }

  findAll(): Promise<HoneyBatch[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.honeyBatch.findMany({
      where: { tenantId },
      orderBy: { productionDate: 'desc' },
    });
  }

  async findOne(id: string): Promise<HoneyBatch> {
    const tenantId = this.tenantContext.requireTenantId();
    const batch = await this.prisma.honeyBatch.findFirst({
      where: { id, tenantId },
    });
    if (!batch) {
      throw new NotFoundException('Honey batch not found');
    }
    return batch;
  }

  async update(id: string, dto: UpdateHoneyBatchDto): Promise<HoneyBatch> {
    const tenantId = this.tenantContext.requireTenantId();
    const current = await this.findOne(id);
    if (dto.productionCycleId) {
      await this.requireProductionCycle(dto.productionCycleId, tenantId);
    }

    const quantityKg = new Prisma.Decimal(dto.quantityKg ?? current.quantityKg);
    const soldQuantityKg = current.quantityKg.minus(
      current.availableQuantityKg,
    );
    if (quantityKg.lessThan(soldQuantityKg)) {
      throw new ConflictException(
        'Quantity cannot be lower than the amount already sold',
      );
    }

    const availableQuantityKg = quantityKg.minus(soldQuantityKg);
    const status = this.resolveStatus(
      availableQuantityKg,
      dto.status,
      current.status,
    );

    try {
      const result = await this.prisma.honeyBatch.updateMany({
        where: { id, tenantId },
        data: {
          productionCycleId: dto.productionCycleId,
          code: dto.code,
          productionDate: dto.productionDate
            ? new Date(dto.productionDate)
            : undefined,
          quantityKg: dto.quantityKg === undefined ? undefined : quantityKg,
          availableQuantityKg:
            dto.quantityKg === undefined ? undefined : availableQuantityKg,
          quality: dto.quality,
          status,
        },
      });
      if (result.count === 0) {
        throw new NotFoundException('Honey batch not found');
      }
      const batch = await this.findOne(id);
      await this.redis.invalidateDashboard(tenantId);
      return batch;
    } catch (error) {
      this.rethrowPersistenceError(error);
    }
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const tenantId = this.tenantContext.requireTenantId();
    try {
      const result = await this.prisma.honeyBatch.deleteMany({
        where: { id, tenantId },
      });
      if (result.count === 0) {
        throw new NotFoundException('Honey batch not found');
      }
      await this.redis.invalidateDashboard(tenantId);
      return { deleted: true };
    } catch (error) {
      this.rethrowPersistenceError(error);
    }
  }

  private resolveStatus(
    availableQuantityKg: Prisma.Decimal,
    requestedStatus: HoneyBatchStatus | undefined,
    currentStatus: HoneyBatchStatus,
  ): HoneyBatchStatus {
    if (availableQuantityKg.isZero()) {
      return HoneyBatchStatus.DEPLETED;
    }
    if (requestedStatus === HoneyBatchStatus.DEPLETED) {
      throw new BadRequestException(
        'A honey batch with available stock cannot be depleted',
      );
    }
    if (requestedStatus) {
      return requestedStatus;
    }
    return currentStatus === HoneyBatchStatus.DEPLETED
      ? HoneyBatchStatus.AVAILABLE
      : currentStatus;
  }

  private async requireProductionCycle(
    productionCycleId: string,
    tenantId: string,
  ): Promise<void> {
    const cycle = await this.prisma.productionCycle.findFirst({
      where: { id: productionCycleId, tenantId },
      select: { id: true },
    });
    if (!cycle) {
      throw new NotFoundException('Production cycle not found');
    }
  }

  private rethrowPersistenceError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Honey batch code is already in use in this tenant',
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new ConflictException('Honey batch is referenced by an order');
    }
    throw error;
  }
}
