import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@domain/entities/user.entity';
import { ChatSession } from '@domain/entities/chat-session.entity';
import { ChatMessage } from '@domain/entities/chat-message.entity';

/**
 * Configuração do banco de dados
 */
export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  if (isProduction) {
    // Configuração para PostgreSQL em produção
    return {
      type: 'postgres',
      host: configService.get('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get('DB_USERNAME', 'postgres'),
      password: configService.get('DB_PASSWORD', 'password'),
      database: configService.get('DB_NAME', 'xandai'),
      entities: [User, ChatSession, ChatMessage],
      synchronize: true, // Auto-create tables from entities
      logging: configService.get('DB_LOGGING', 'false') === 'true',
      ssl: configService.get('DB_SSL', 'false') === 'true' ? {
        rejectUnauthorized: false,
      } : false,
      extra: {
        connectionLimit: configService.get<number>('DB_CONNECTION_LIMIT', 10),
      },
    };
  } else {
    // Configuração para SQLite em desenvolvimento
    return {
      type: 'sqlite',
      database: configService.get('DB_PATH', 'data/xandai.sqlite'),
      entities: [User, ChatSession, ChatMessage],
      synchronize: true, // Apenas em desenvolvimento
      logging: configService.get('DB_LOGGING', 'false') === 'true',
      dropSchema: false,
    };
  }
};

/**
 * Configuração das variáveis de ambiente
 */
export const databaseConfigValidation = () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // SQLite (desenvolvimento)
  DB_PATH: process.env.DB_PATH || 'data/xandai.sqlite',
  
  // PostgreSQL (produção)
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_USERNAME: process.env.DB_USERNAME || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_NAME: process.env.DB_NAME || 'xandai',
  DB_SSL: process.env.DB_SSL || 'false',
  DB_CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  
  // Configurações gerais
  DB_LOGGING: process.env.DB_LOGGING || 'false',
});
