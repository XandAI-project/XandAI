import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { WhatsAppUseCase } from '../../application/use-cases/whatsapp.use-case';
import { WhatsAppService } from '../../infrastructure/services/whatsapp.service';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { WhatsAppSession } from '../../domain/entities/whatsapp-session.entity';
import { WhatsAppMessage } from '../../domain/entities/whatsapp-message.entity';
import { WhatsAppConfig } from '../../domain/entities/whatsapp-config.entity';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { WhatsAppMessageRepository } from '../../infrastructure/repositories/whatsapp-message.repository';
import { WhatsAppConfigRepository } from '../../infrastructure/repositories/whatsapp-config.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsAppSession,
      WhatsAppMessage,
      WhatsAppConfig,
    ]),
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppUseCase,
    WhatsAppService,
    OllamaService,
    {
      provide: 'IWhatsAppSessionRepository',
      useClass: WhatsAppSessionRepository,
    },
    {
      provide: 'IWhatsAppMessageRepository',
      useClass: WhatsAppMessageRepository,
    },
    {
      provide: 'IWhatsAppConfigRepository',
      useClass: WhatsAppConfigRepository,
    },
  ],
  exports: [WhatsAppService, WhatsAppUseCase],
})
export class WhatsAppModule {}
