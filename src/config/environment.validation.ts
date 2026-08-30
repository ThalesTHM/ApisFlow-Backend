import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'test',
      then: Joi.string().default(
        'postgresql://postgres:postgres@localhost:5432/honey_manager_test',
      ),
      otherwise: Joi.required(),
    }),
  REDIS_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'test',
      then: Joi.string().default('redis://localhost:6379'),
      otherwise: Joi.required(),
    }),
  JWT_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'test',
      then: Joi.string().default('test-secret-with-at-least-32-characters'),
      otherwise: Joi.required(),
    }),
  JWT_EXPIRES_IN: Joi.number().integer().positive().default(900),
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
});
