import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    service = new RedisService({
      getOrThrow: jest.fn(() => 'redis://localhost:6379'),
    } as unknown as ConfigService);
  });

  afterEach(() => {
    service.client.disconnect();
  });

  it('returns cached JSON without invoking the loader', async () => {
    jest.spyOn(service.client, 'get').mockResolvedValue('{"value":7}');
    const loader = jest.fn(() => Promise.resolve({ value: 9 }));

    await expect(service.getOrSet('key', 60, loader)).resolves.toEqual({
      value: 7,
    });
    expect(loader).not.toHaveBeenCalled();
  });

  it('loads and caches a missing value with the requested TTL', async () => {
    jest.spyOn(service.client, 'get').mockResolvedValue(null);
    const set = jest.spyOn(service.client, 'set').mockResolvedValue('OK');

    await expect(
      service.getOrSet('key', 60, () => Promise.resolve({ value: 9 })),
    ).resolves.toEqual({ value: 9 });
    expect(set).toHaveBeenCalledWith('key', '{"value":9}', 'EX', 60);
  });

  it('invalidates only dashboard keys for the specified tenant', async () => {
    const scan = jest
      .spyOn(service.client, 'scan')
      .mockResolvedValue(['0', ['dashboard:tenant-a:summary']]);
    const unlink = jest.spyOn(service.client, 'unlink').mockResolvedValue(1);

    await service.invalidateDashboard('tenant-a');

    expect(scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'dashboard:tenant-a:*',
      'COUNT',
      100,
    );
    expect(unlink).toHaveBeenCalledWith('dashboard:tenant-a:summary');
  });

  it('publishes a tenant-scoped domain event envelope', async () => {
    const publish = jest.spyOn(service.client, 'publish').mockResolvedValue(1);

    await service.publishDomainEvent('hive.created', 'tenant-a', {
      hiveId: 'hive-a',
    });

    expect(publish).toHaveBeenCalledWith(
      'domain-events',
      expect.stringContaining('"name":"hive.created"'),
    );
    expect(publish).toHaveBeenCalledWith(
      'domain-events',
      expect.stringContaining('"tenantId":"tenant-a"'),
    );
  });
});
