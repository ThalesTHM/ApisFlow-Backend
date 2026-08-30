import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const logger = new ConsoleLogger({
    json: process.env.NODE_ENV === 'production',
    timestamp: true,
  });
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger,
  });
  configureApp(app);

  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  logger.log(`Honey Manager API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
