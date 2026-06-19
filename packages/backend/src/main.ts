import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser (for refresh token httpOnly cookie)
  app.use(cookieParser());

  // Global validation — strip unknown fields, transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serialize class instances in responses
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // CORS — tighten origins in production
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  });

  // Swagger UI at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Cafe Platform API')
    .setDescription('REST API for the cafe management system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Swagger UI:  http://localhost:${port}/api/docs`);
}

bootstrap();
