import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from './src/app.module.js';

async function exportSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Service Desk ITIL v4')
    .setDescription('API do sistema de Service Desk baseado em ITIL v4')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('swagger.json', JSON.stringify(document, null, 2));

  console.log('Swagger exportado para swagger.json');
  await app.close();
}

exportSwagger().catch(console.error);
