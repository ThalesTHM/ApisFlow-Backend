import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Apiary, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { CreateApiaryDto } from './dto/create-apiary.dto';
import { UpdateApiaryDto } from './dto/update-apiary.dto';

@Injectable()
export class ApiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  create(dto: CreateApiaryDto): Promise<Apiary> {
    const tenantId = this.tenantContext.requireTenantId();
    this.validateCoordinates(dto.latitude, dto.longitude);
    return this.prisma.apiary.create({
      data: { tenantId, ...dto },
    });
  }

  findAll(): Promise<Apiary[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.apiary.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Apiary> {
    const tenantId = this.tenantContext.requireTenantId();
    const apiary = await this.prisma.apiary.findFirst({
      where: { id, tenantId },
    });
    if (!apiary) {
      throw new NotFoundException('Apiary not found');
    }
    return apiary;
  }

  async update(id: string, dto: UpdateApiaryDto): Promise<Apiary> {
    const tenantId = this.tenantContext.requireTenantId();
    const current = await this.findOne(id);
    this.validateCoordinates(
      dto.latitude ?? current.latitude?.toNumber(),
      dto.longitude ?? current.longitude?.toNumber(),
    );
    const data: Prisma.ApiaryUpdateManyMutationInput = dto;
    const result = await this.prisma.apiary.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundException('Apiary not found');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const tenantId = this.tenantContext.requireTenantId();
    const result = await this.prisma.apiary.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Apiary not found');
    }
    return { deleted: true };
  }

  private validateCoordinates(latitude?: number, longitude?: number): void {
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together',
      );
    }
  }
}
