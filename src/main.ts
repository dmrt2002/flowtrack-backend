import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3001');

  // Enable CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('FlowTrack Backend API')
    .setDescription('Multi-tenant SaaS backend built with NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Health', 'Health check endpoints')
    .addTag('Workspaces', 'Workspace management endpoints')
    .addTag('Projects', 'Project management endpoints')
    .addTag('Tasks', 'Task management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health check: http://localhost:${port}/health`);
}

bootstrap();
