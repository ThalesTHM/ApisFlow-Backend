import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface DomainEvent {
  name:
    | 'hive.created'
    | 'production.completed'
    | 'honey-batch.created'
    | 'order.confirmed';
  tenantId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await loader();
    await this.setJson(key, value, ttlSeconds);
    return value;
  }

  async invalidateDashboard(tenantId: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `dashboard:${tenantId}:*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.unlink(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logFailure('invalidate dashboard cache', error);
    }
  }

  async publishDomainEvent(
    name: DomainEvent['name'],
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const event: DomainEvent = {
      name,
      tenantId,
      occurredAt: new Date().toISOString(),
      payload,
    };

    try {
      await this.client.publish('domain-events', JSON.stringify(event));
    } catch (error) {
      this.logFailure(`publish ${name}`, error);
    }
  }

  private async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value === null ? null : (JSON.parse(value) as T);
    } catch (error) {
      this.logFailure(`read cache key ${key}`, error);
      return null;
    }
  }

  private async setJson<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logFailure(`write cache key ${key}`, error);
    }
  }

  private logFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis failed to ${operation}: ${message}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }

    this.client.disconnect();
  }
}
