import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../domain/entities/user.entity';
import { ChatSession } from '../../domain/entities/chat-session.entity';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { ChatUseCase } from '../../application/use-cases/chat.use-case';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { ChatSessionRepository } from '../../infrastructure/repositories/chat-session.repository';
import { ChatMessageRepository } from '../../infrastructure/repositories/chat-message.repository';
import { ChatController } from '../controllers/chat.controller';
import { AuthModule } from './auth.module';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';

/**
 * Módulo de chat
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, ChatSession, ChatMessage]),
    AuthModule, // Para usar o JwtAuthGuard
  ],
  controllers: [ChatController],
  providers: [
    ChatUseCase,
    OllamaService,
    StableDiffusionService,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IChatSessionRepository',
      useClass: ChatSessionRepository,
    },
    {
      provide: 'IChatMessageRepository',
      useClass: ChatMessageRepository,
    },
  ],
  exports: [ChatUseCase],
})
export class ChatModule {}
