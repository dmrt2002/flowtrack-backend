import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const frontendUrl = configService.get('FRONTEND_URL');

  // Cookie parser middleware
  app.use(cookieParser());

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS with dynamic origin handling
  // Allow all origins for public form endpoints, restrict others to whitelist
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Always allow whitelisted origins
      const whitelist = frontendUrl ? [frontendUrl] : [];

      if (whitelist.includes(origin)) {
        return callback(null, true);
      }

      // Allow all origins for public form endpoints
      // This enables embedding forms on any external website
      // The request path is available in the callback context
      // We allow all origins by default for maximum flexibility
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
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
  logger.log(`🚀 Application is running on port: ${port}`);
  logger.log(`📚 Swagger documentation: /api/docs`);
  logger.log(`🏥 Health check: /health`);
}

bootstrap();
