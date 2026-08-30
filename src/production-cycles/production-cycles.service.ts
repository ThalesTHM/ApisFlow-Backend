import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductionCycle, ProductionCycleStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { CreateProductionCycleDto } from './dto/create-production-cycle.dto';
import { ProductionCycleFilterDto } from './dto/production-cycle-filter.dto';
import { UpdateProductionCycleDto } from './dto/update-production-cycle.dto';

interface CycleValues {
  startDate: Date;
  endDate?: Date | null;
  status: ProductionCycleStatus;
  actualProductionKg?: number | null;
}

@Injectable()
export class ProductionCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateProductionCycleDto): Promise<ProductionCycle> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.requireHive(dto.hiveId, tenantId);
    const values: CycleValues = {
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: dto.status ?? ProductionCycleStatus.PLANNED,
      actualProductionKg: dto.actualProductionKg,
    };
    this.validateCycle(values);
    await this.ensureSingleActiveCycle(dto.hiveId, tenantId, values.status);

    return this.prisma.productionCycle.create({
      data: {
        tenantId,
        hiveId: dto.hiveId,
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status,
        estimatedProductionKg: dto.estimatedProductionKg,
        actualProductionKg: dto.actualProductionKg,
        notes: dto.notes,
      },
    });
  }

  findAll(filter: ProductionCycleFilterDto): Promise<ProductionCycle[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.productionCycle.findMany({
      where: { tenantId, hiveId: filter.hiveId, status: filter.status },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string): Promise<ProductionCycle> {
    const tenantId = this.tenantContext.requireTenantId();
    const cycle = await this.prisma.productionCycle.findFirst({
      where: { id, tenantId },
    });
    if (!cycle) {
      throw new NotFoundException('Production cycle not found');
    }
    return cycle;
  }

  async update(
    id: string,
    dto: UpdateProductionCycleDto,
  ): Promise<ProductionCycle> {
    const tenantId = this.tenantContext.requireTenantId();
    const current = await this.findOne(id);
    const hiveId = dto.hiveId ?? current.hiveId;
    if (dto.hiveId) {
      await this.requireHive(dto.hiveId, tenantId);
    }
    const values: CycleValues = {
      startDate: dto.startDate ? new Date(dto.startDate) : current.startDate,
      endDate:
        dto.endDate !== undefined ? new Date(dto.endDate) : current.endDate,
      status: dto.status ?? current.status,
      actualProductionKg:
        dto.actualProductionKg ?? current.actualProductionKg?.toNumber(),
    };
    this.validateCycle(values);
    await this.ensureSingleActiveCycle(hiveId, tenantId, values.status, id);

    const result = await this.prisma.productionCycle.updateMany({
      where: { id, tenantId },
      data: {
        hiveId: dto.hiveId,
        startDate: dto.startDate ? values.startDate : undefined,
        endDate: dto.endDate ? values.endDate : undefined,
        status: dto.status,
        estimatedProductionKg: dto.estimatedProductionKg,
        actualProductionKg: dto.actualProductionKg,
        notes: dto.notes,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException('Production cycle not found');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const tenantId = this.tenantContext.requireTenantId();
    const result = await this.prisma.productionCycle.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Production cycle not found');
    }
    return { deleted: true };
  }

  private validateCycle(values: CycleValues): void {
    if (values.endDate && values.endDate < values.startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
    if (
      values.status === ProductionCycleStatus.COMPLETED &&
      (!values.endDate ||
        values.actualProductionKg === undefined ||
        values.actualProductionKg === null)
    ) {
      throw new BadRequestException(
        'Completed cycles require an end date and actual production',
      );
    }
  }

  private async requireHive(hiveId: string, tenantId: string): Promise<void> {
    const hive = await this.prisma.hive.findFirst({
      where: { id: hiveId, tenantId },
      select: { id: true },
    });
    if (!hive) {
      throw new NotFoundException('Hive not found');
    }
  }

  private async ensureSingleActiveCycle(
    hiveId: string,
    tenantId: string,
    status: ProductionCycleStatus,
    excludedId?: string,
  ): Promise<void> {
    if (status !== ProductionCycleStatus.ACTIVE) {
      return;
    }
    const activeCycle = await this.prisma.productionCycle.findFirst({
      where: {
        hiveId,
        tenantId,
        status: ProductionCycleStatus.ACTIVE,
        id: excludedId ? { not: excludedId } : undefined,
      },
      select: { id: true },
    });
    if (activeCycle) {
      throw new ConflictException(
        'Hive already has an active production cycle',
      );
    }
  }
}
