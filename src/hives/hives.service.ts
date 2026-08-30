import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Hive, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { CreateHiveDto } from './dto/create-hive.dto';
import { HiveFilterDto } from './dto/hive-filter.dto';
import { UpdateHiveDto } from './dto/update-hive.dto';

@Injectable()
export class HivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateHiveDto): Promise<Hive> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.requireApiary(dto.apiaryId, tenantId);

    try {
      return await this.prisma.hive.create({
        data: {
          tenantId,
          apiaryId: dto.apiaryId,
          code: dto.code,
          queenStatus: dto.queenStatus,
          colonyStatus: dto.colonyStatus,
          installationDate: new Date(dto.installationDate),
          notes: dto.notes,
        },
      });
    } catch (error) {
      this.rethrowDuplicateCode(error);
    }
  }

  findAll(filter: HiveFilterDto): Promise<Hive[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.hive.findMany({
      where: {
        tenantId,
        apiaryId: filter.apiaryId,
        colonyStatus: filter.status,
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string): Promise<Hive> {
    const tenantId = this.tenantContext.requireTenantId();
    const hive = await this.prisma.hive.findFirst({
      where: { id, tenantId },
    });
    if (!hive) {
      throw new NotFoundException('Hive not found');
    }
    return hive;
  }

  async update(id: string, dto: UpdateHiveDto): Promise<Hive> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.findOne(id);
    if (dto.apiaryId) {
      await this.requireApiary(dto.apiaryId, tenantId);
    }

    try {
      const result = await this.prisma.hive.updateMany({
        where: { id, tenantId },
        data: {
          apiaryId: dto.apiaryId,
          code: dto.code,
          queenStatus: dto.queenStatus,
          colonyStatus: dto.colonyStatus,
          installationDate: dto.installationDate
            ? new Date(dto.installationDate)
            : undefined,
          notes: dto.notes,
        },
      });
      if (result.count === 0) {
        throw new NotFoundException('Hive not found');
      }
      return this.findOne(id);
    } catch (error) {
      this.rethrowDuplicateCode(error);
    }
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const tenantId = this.tenantContext.requireTenantId();
    const result = await this.prisma.hive.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Hive not found');
    }
    return { deleted: true };
  }

  private async requireApiary(
    apiaryId: string,
    tenantId: string,
  ): Promise<void> {
    const apiary = await this.prisma.apiary.findFirst({
      where: { id: apiaryId, tenantId },
      select: { id: true },
    });
    if (!apiary) {
      throw new NotFoundException('Apiary not found');
    }
  }

  private rethrowDuplicateCode(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Hive code is already in use in this tenant');
    }
    throw error;
  }
}
