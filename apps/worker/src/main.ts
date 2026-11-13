import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  // Cloud Run sets PORT=8080. Locally it is unset, so the worker uses 8082 (API uses 8080).
  await app.listen(Number(process.env.PORT ?? 8082), '0.0.0.0');
}

void bootstrap();
