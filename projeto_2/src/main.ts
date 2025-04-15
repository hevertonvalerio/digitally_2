import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  const prefix = configService.get('API_PREFIX') || 'api';

  // Definir o prefixo global antes de configurar o Swagger
  app.setGlobalPrefix(prefix);

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Sistema de Agendamento Médico')
    .setDescription('API para gerenciamento de consultas médicas, notificações e relatórios')
    .setVersion('1.0')
    .addTag('medical-consultations', 'Endpoints de consultas médicas')
    .addTag('scheduler', 'Endpoints de agendamento')
    .addTag('reports', 'Endpoints de relatórios')
    .addTag('whatsapp', 'Endpoints de WhatsApp')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  logger.log(`Aplicação rodando em http://localhost:${port}`);
  logger.log(`Documentação Swagger disponível em http://localhost:${port}/api`);
}

bootstrap();
