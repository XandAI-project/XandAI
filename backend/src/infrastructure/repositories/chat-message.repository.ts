import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';

import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';
import { ChatMessage } from '../../domain/entities/chat-message.entity';

/**
 * Implementação do repositório de mensagens de chat usando TypeORM
 */
@Injectable()
export class ChatMessageRepository implements IChatMessageRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
  ) {}

  async findById(id: string): Promise<ChatMessage | null> {
    return await this.messageRepository.findOne({ where: { id } });
  }

  async create(messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    const message = this.messageRepository.create(messageData);
    return await this.messageRepository.save(message);
  }

  async update(id: string, messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    await this.messageRepository.update(id, messageData);
    const updatedMessage = await this.findById(id);
    if (!updatedMessage) {
      throw new Error('Mensagem não encontrada após atualização');
    }
    return updatedMessage;
  }

  async delete(id: string): Promise<void> {
    await this.messageRepository.delete(id);
  }

  async findBySessionId(
    sessionId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const [messages, total] = await this.messageRepository.findAndCount({
      where: { chatSessionId: sessionId },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'ASC', // Mensagens em ordem cronológica
      },
    });

    return { messages, total };
  }

  async findLastBySessionId(sessionId: string): Promise<ChatMessage | null> {
    return await this.messageRepository.findOne({
      where: { chatSessionId: sessionId },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findRecentByUserId(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.chatSession', 'session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.status = :status', { status: 'active' }) // Only from active sessions
      .orderBy('message.createdAt', 'ASC') // Chronological order (oldest first)
      .limit(limit)
      .getMany();
  }

  async findByRole(sessionId: string, role: 'user' | 'assistant' | 'system'): Promise<ChatMessage[]> {
    return await this.messageRepository.find({
      where: {
        chatSessionId: sessionId,
        role,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async searchInSession(sessionId: string, query: string): Promise<ChatMessage[]> {
    return await this.messageRepository.find({
      where: {
        chatSessionId: sessionId,
        content: Like(`%${query}%`),
      },
      order: {
        createdAt: 'DESC',
      },
      take: 100, // Limita resultados da busca
    });
  }

  async findByDateRange(sessionId: string, startDate: Date, endDate: Date): Promise<ChatMessage[]> {
    return await this.messageRepository.find({
      where: {
        chatSessionId: sessionId,
        createdAt: Between(startDate, endDate),
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async countBySessionId(sessionId: string): Promise<number> {
    return await this.messageRepository.count({
      where: { chatSessionId: sessionId },
    });
  }

  async countByRole(sessionId: string, role: 'user' | 'assistant' | 'system'): Promise<number> {
    return await this.messageRepository.count({
      where: {
        chatSessionId: sessionId,
        role,
      },
    });
  }

  async createMany(messagesData: Partial<ChatMessage>[]): Promise<ChatMessage[]> {
    const messages = this.messageRepository.create(messagesData);
    return await this.messageRepository.save(messages);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.messageRepository.delete({ chatSessionId: sessionId });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.messageRepository.count({
      where: { id },
    });
    return count > 0;
  }

  async belongsToSession(messageId: string, sessionId: string): Promise<boolean> {
    const count = await this.messageRepository.count({
      where: {
        id: messageId,
        chatSessionId: sessionId,
      },
    });
    return count > 0;
  }
}
