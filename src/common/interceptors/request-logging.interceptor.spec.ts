import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { lastValueFrom, of } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

describe('RequestLoggingInterceptor', () => {
  it('propagates a request ID and logs request identity as structured data', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/hives',
      header: jest.fn((name: string) => {
        if (name === 'x-request-id') return 'request-123';
        if (name === 'user-agent') return 'jest';
        return undefined;
      }),
      user: {
        sub: 'user-a',
        tenantId: 'tenant-a',
        roles: [UserRole.ADMIN],
      },
    };
    const response = { statusCode: 200, setHeader: jest.fn() };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
    const next = { handle: () => of({}) } as CallHandler;

    await lastValueFrom(
      new RequestLoggingInterceptor().intercept(context, next),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'request-123',
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-123',
        method: 'GET',
        path: '/api/v1/hives',
        statusCode: 200,
        tenantId: 'tenant-a',
        userId: 'user-a',
        userAgent: 'jest',
        durationMs: expect.any(Number) as number,
      }),
    );
    loggerSpy.mockRestore();
  });
});
