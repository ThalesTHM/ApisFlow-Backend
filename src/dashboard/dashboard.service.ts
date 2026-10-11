import { Injectable } from '@nestjs/common';
import {
  ColonyStatus,
  OrderStatus,
  Prisma,
  ProductionCycleStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import {
  ProductionPeriod,
  ProductionQueryDto,
} from './dto/production-query.dto';

const DASHBOARD_TTL_SECONDS = 60;

export interface DashboardSummary {
  totalApiaries: number;
  totalHives: number;
  activeHives: number;
  productionCyclesInProgress: number;
  honeyStockKg: number;
  pendingOrders: number;
}

export interface ProductionPoint {
  period: string;
  quantityKg: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenantContext: TenantContextService,
  ) {}

  summary(): Promise<DashboardSummary> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.redis.getOrSet(
      `dashboard:${tenantId}:summary`,
      DASHBOARD_TTL_SECONDS,
      async () => {
        const [
          totalApiaries,
          totalHives,
          activeHives,
          productionCyclesInProgress,
          honeyStock,
          pendingOrders,
        ] = await Promise.all([
          this.prisma.apiary.count({ where: { tenantId } }),
          this.prisma.hive.count({ where: { tenantId } }),
          this.prisma.hive.count({
            where: {
              tenantId,
              colonyStatus: { not: ColonyStatus.INACTIVE },
            },
          }),
          this.prisma.productionCycle.count({
            where: { tenantId, status: ProductionCycleStatus.ACTIVE },
          }),
          this.prisma.honeyBatch.aggregate({
            where: { tenantId },
            _sum: { availableQuantityKg: true },
          }),
          this.prisma.order.count({
            where: { tenantId, status: OrderStatus.PENDING },
          }),
        ]);

        return {
          totalApiaries,
          totalHives,
          activeHives,
          productionCyclesInProgress,
          honeyStockKg: honeyStock._sum.availableQuantityKg?.toNumber() ?? 0,
          pendingOrders,
        };
      },
    );
  }

  production(query: ProductionQueryDto): Promise<ProductionPoint[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.redis.getOrSet(
      `dashboard:${tenantId}:production:${query.period}`,
      DASHBOARD_TTL_SECONDS,
      async () => {
        const batches = await this.prisma.honeyBatch.findMany({
          where: { tenantId },
          select: { productionDate: true, quantityKg: true },
          orderBy: { productionDate: 'asc' },
        });
        const totals = new Map<string, Prisma.Decimal>();

        for (const batch of batches) {
          const period = this.periodKey(batch.productionDate, query.period);
          totals.set(
            period,
            (totals.get(period) ?? new Prisma.Decimal(0)).add(batch.quantityKg),
          );
        }

        return Array.from(totals, ([period, quantityKg]) => ({
          period,
          quantityKg: quantityKg.toNumber(),
        }));
      },
    );
  }

  private periodKey(date: Date, period: ProductionPeriod): string {
    const isoDate = date.toISOString();
    if (period === ProductionPeriod.DAY) {
      return isoDate.slice(0, 10);
    }
    if (period === ProductionPeriod.YEAR) {
      return isoDate.slice(0, 4);
    }
    return isoDate.slice(0, 7);
  }
}
