// Polyfill para crypto em versões antigas do Node.js
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { AppModule } from './app.module';

/**
 * Função principal para inicializar a aplicação
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Configurar servir arquivos estáticos (imagens)
  // Use process.cwd() for consistent path in Docker container
  const imagesPath = join(process.cwd(), 'public', 'images');
  logger.log(`📸 Serving images from: ${imagesPath}`);
  app.useStaticAssets(imagesPath, {
    prefix: '/images/',
    index: false,
  });

  // Prefixo global para todas as rotas
  app.setGlobalPrefix('api/v1');

  // Configuração global de validação
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não definidas no DTO
      forbidNonWhitelisted: true, // Lança erro para propriedades extras
      transform: true, // Transforma tipos automaticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS: ACEITA TODAS AS ORIGENS - SEM RESTRIÇÕES
  app.enableCors({
    origin: true, // SEMPRE aceita qualquer origem
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Porta da aplicação
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);

  logger.log(`🚀 Aplicação iniciada na porta ${port}`);
  logger.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
  logger.log(`📊 Database: ${configService.get('NODE_ENV') === 'production' ? 'PostgreSQL' : 'SQLite'}`);
  logger.log(`🔓 CORS: ✅ ACEITA TODAS AS ORIGENS (SEM RESTRIÇÕES)`);
  logger.log(`📡 API Routes: /api/v1/*`);
}

bootstrap().catch((error) => {
  console.error('❌ Erro ao inicializar a aplicação:', error);
  process.exit(1);
});
