import { environmentValidationSchema } from './environment.validation';

describe('environmentValidationSchema', () => {
  const required = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/honey_manager',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'a-secret-with-at-least-thirty-two-characters',
  };

  it.each(['development', 'test', 'staging', 'production'])(
    'accepts the %s environment profile',
    (NODE_ENV) => {
      const { error } = environmentValidationSchema.validate({
        ...required,
        NODE_ENV,
      });

      expect(error).toBeUndefined();
    },
  );

  it('rejects short JWT secrets', () => {
    const { error } = environmentValidationSchema.validate({
      ...required,
      JWT_SECRET: 'short',
    });

    expect(error?.message).toContain('JWT_SECRET');
  });
});
