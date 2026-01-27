import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppConfig } from '../../domain/entities/whatsapp-config.entity';
import { IWhatsAppConfigRepository } from '../../domain/repositories/whatsapp-config.repository.interface';

@Injectable()
export class WhatsAppConfigRepository implements IWhatsAppConfigRepository {
  constructor(
    @InjectRepository(WhatsAppConfig)
    private readonly repository: Repository<WhatsAppConfig>,
  ) {}

  async create(data: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const config = this.repository.create(data);
    return await this.repository.save(config);
  }

  async findById(id: string): Promise<WhatsAppConfig | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<WhatsAppConfig | null> {
    return await this.repository.findOne({ where: { userId } });
  }

  async update(id: string, data: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async createDefaultForUser(userId: string): Promise<WhatsAppConfig> {
    const defaultConfig: Partial<WhatsAppConfig> = {
      userId,
      tone: 'friendly',
      style: 'conversational',
      language: 'pt-BR',
      autoReplyEnabled: true,
      responseDelayMs: 2000,
      maxResponseDelayMs: 10000,
      useTypingIndicator: true,
      blockedContacts: [],
      allowedContacts: [],
      whitelistMode: false,
      blockedKeywords: [],
      ignoreGroups: true,
      ignoreMedia: true,
      maxMessagesPerHour: 30,
      maxMessagesPerChatPerHour: 5,
      defaultModel: 'llama3.2',
      temperature: 0.7,
      maxTokens: 500,
      conversationContextLimit: 10,
    };

    return await this.create(defaultConfig);
  }
}
