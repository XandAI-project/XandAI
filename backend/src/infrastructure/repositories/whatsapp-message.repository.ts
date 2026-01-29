import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { WhatsAppMessage } from '../../domain/entities/whatsapp-message.entity';
import { IWhatsAppMessageRepository } from '../../domain/repositories/whatsapp-message.repository.interface';

@Injectable()
export class WhatsAppMessageRepository implements IWhatsAppMessageRepository {
  constructor(
    @InjectRepository(WhatsAppMessage)
    private readonly repository: Repository<WhatsAppMessage>,
  ) {}

  async create(data: Partial<WhatsAppMessage>): Promise<WhatsAppMessage> {
    const message = this.repository.create(data);
    return await this.repository.save(message);
  }

  async findById(id: string): Promise<WhatsAppMessage | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByWhatsappMessageId(whatsappMessageId: string): Promise<WhatsAppMessage | null> {
    return await this.repository.findOne({ 
      where: { messageId: whatsappMessageId } 
    });
  }

  async findBySessionId(
    sessionId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: WhatsAppMessage[]; total: number }> {
    const [messages, total] = await this.repository.findAndCount({
      where: { whatsappSessionId: sessionId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages, total };
  }

  async findByChatId(
    chatId: string,
    sessionId: string,
    limit: number = 20
  ): Promise<WhatsAppMessage[]> {
    return await this.repository.find({
      where: { chatId, whatsappSessionId: sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findPendingMessages(sessionId: string): Promise<WhatsAppMessage[]> {
    return await this.repository.find({
      where: { 
        whatsappSessionId: sessionId,
        direction: 'incoming' as any,
        wasRepliedTo: false
      },
      order: { createdAt: 'ASC' },
    });
  }

  async update(id: string, data: Partial<WhatsAppMessage>): Promise<WhatsAppMessage> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async markAsProcessed(id: string, aiResponseId: string): Promise<void> {
    await this.repository.update(id, {
      wasRepliedTo: true,
      updatedAt: new Date()
    });
  }

  async countMessagesByChat(chatId: string, sessionId: string, hoursAgo: number): Promise<number> {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - hoursAgo);

    return await this.repository.count({
      where: {
        chatId,
        whatsappSessionId: sessionId,
        direction: 'outgoing' as any,
        createdAt: MoreThanOrEqual(timeThreshold)
      }
    });
  }
}
