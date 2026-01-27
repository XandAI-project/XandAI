import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getDatabaseConfig, databaseConfigValidation } from './infrastructure/database/database.config';
import { AuthModule } from './presentation/modules/auth.module';
import { ChatModule } from './presentation/modules/chat.module';
import { StableDiffusionModule } from './presentation/modules/stable-diffusion.module';
import { WhatsAppModule } from './presentation/modules/whatsapp.module';

/**
 * Módulo principal da aplicação
 */
@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfigValidation],
      envFilePath: ['.env.local', '.env'],
    }),

    // Configuração do banco de dados
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Módulos da aplicação
    AuthModule,
    ChatModule,
    StableDiffusionModule,
    WhatsAppModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
