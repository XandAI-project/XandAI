"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfigValidation = exports.getDatabaseConfig = void 0;
const user_entity_1 = require("../../domain/entities/user.entity");
const chat_session_entity_1 = require("../../domain/entities/chat-session.entity");
const chat_message_entity_1 = require("../../domain/entities/chat-message.entity");
const getDatabaseConfig = (configService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    if (isProduction) {
        return {
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'password'),
            database: configService.get('DB_NAME', 'xandai'),
            entities: [user_entity_1.User, chat_session_entity_1.ChatSession, chat_message_entity_1.ChatMessage],
            synchronize: true,
            logging: configService.get('DB_LOGGING', 'false') === 'true',
            ssl: configService.get('DB_SSL', 'false') === 'true' ? {
                rejectUnauthorized: false,
            } : false,
            extra: {
                connectionLimit: configService.get('DB_CONNECTION_LIMIT', 10),
            },
        };
    }
    else {
        return {
            type: 'sqlite',
            database: configService.get('DB_PATH', 'data/xandai.sqlite'),
            entities: [user_entity_1.User, chat_session_entity_1.ChatSession, chat_message_entity_1.ChatMessage],
            synchronize: true,
            logging: configService.get('DB_LOGGING', 'false') === 'true',
            dropSchema: false,
        };
    }
};
exports.getDatabaseConfig = getDatabaseConfig;
const databaseConfigValidation = () => ({
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_PATH: process.env.DB_PATH || 'data/xandai.sqlite',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'password',
    DB_NAME: process.env.DB_NAME || 'xandai',
    DB_SSL: process.env.DB_SSL || 'false',
    DB_CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    DB_LOGGING: process.env.DB_LOGGING || 'false',
});
exports.databaseConfigValidation = databaseConfigValidation;
//# sourceMappingURL=database.config.js.map