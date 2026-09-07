import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Service Desk ITIL v4 - API')
    .setDescription('API de gerenciamento de tickets, mudanças e problemas')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`API rodando em http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`Swagger em http://localhost:${port}/swagger`);
}

await bootstrap();