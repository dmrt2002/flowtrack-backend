"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 3000);
    const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:3001');
    app.use((0, cookie_parser_1.default)());
    app.setGlobalPrefix('api/v1');
    app.enableCors({
        origin: [
            frontendUrl,
            'http://localhost:3001',
            'http://localhost:3000',
            'http://localhost:3003',
        ],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('FlowTrack Backend API')
        .setDescription('Multi-tenant SaaS backend built with NestJS')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Health', 'Health check endpoints')
        .addTag('Workspaces', 'Workspace management endpoints')
        .addTag('Projects', 'Project management endpoints')
        .addTag('Tasks', 'Task management endpoints')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(port);
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health check: http://localhost:${port}/health`);
}
bootstrap();
//# sourceMappingURL=main.js.map