import { WhatsAppMessage } from '../entities/whatsapp-message.entity';

/**
 * Interface do repositório de mensagens WhatsApp
 */
export interface IWhatsAppMessageRepository {
  create(data: Partial<WhatsAppMessage>): Promise<WhatsAppMessage>;
  findById(id: string): Promise<WhatsAppMessage | null>;
  findByWhatsappMessageId(whatsappMessageId: string): Promise<WhatsAppMessage | null>;
  findBySessionId(
    sessionId: string, 
    page?: number, 
    limit?: number
  ): Promise<{ messages: WhatsAppMessage[]; total: number }>;
  findByChatId(
    chatId: string, 
    sessionId: string,
    limit?: number
  ): Promise<WhatsAppMessage[]>;
  findPendingMessages(sessionId: string): Promise<WhatsAppMessage[]>;
  update(id: string, data: Partial<WhatsAppMessage>): Promise<WhatsAppMessage>;
  delete(id: string): Promise<void>;
  markAsProcessed(id: string, aiResponseId: string): Promise<void>;
  countMessagesByChat(chatId: string, sessionId: string, hoursAgo: number): Promise<number>;
}
