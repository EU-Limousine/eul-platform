import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { validationPipe } from './common/validation';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  // rawBody: payment webhooks need the exact bytes to verify signatures (§4.10).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }), credentials: true });
  app.useGlobalPipes(validationPipe);
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('EU Limousine API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    // UI at /docs, JSON at /docs-json (Orval reads it).
    // operationId "Users_list" → Orval hook `useUsersList`
    const document = SwaggerModule.createDocument(app, doc, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
    });
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
