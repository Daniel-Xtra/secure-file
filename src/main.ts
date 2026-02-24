import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationConfig } from './config/validation.config';
import helmet from 'helmet';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { NODE_ENV, PORT, HOST } from './utils/secrets';
import logger from './utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalPipes(createValidationConfig());
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  });
  await app.listen(PORT);
  logger.info(`Application is running on: http://${HOST}:${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
}
bootstrap();
