"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (!globalThis.crypto) {
    globalThis.crypto = require('crypto').webcrypto;
}
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const logger = new common_1.Logger('Bootstrap');
    const imagesPath = (0, path_1.join)(process.cwd(), 'public', 'images');
    logger.log(`📸 Serving images from: ${imagesPath}`);
    app.useStaticAssets(imagesPath, {
        prefix: '/images/',
        index: false,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors({
        origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    const port = configService.get('PORT', 3001);
    await app.listen(port);
    logger.log(`🚀 Aplicação iniciada na porta ${port}`);
    logger.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
    logger.log(`📊 Database: ${configService.get('NODE_ENV') === 'production' ? 'PostgreSQL' : 'SQLite'}`);
    logger.log(`🔒 CORS Origin: ${configService.get('CORS_ORIGIN', 'http://localhost:3000')}`);
}
bootstrap().catch((error) => {
    console.error('❌ Erro ao inicializar a aplicação:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map