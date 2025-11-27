import { ChatMessage } from '../entities/chat-message.entity';
export interface IChatMessageRepository {
    findById(id: string): Promise<ChatMessage | null>;
    create(messageData: Partial<ChatMessage>): Promise<ChatMessage>;
    update(id: string, messageData: Partial<ChatMessage>): Promise<ChatMessage>;
    delete(id: string): Promise<void>;
    findBySessionId(sessionId: string, page?: number, limit?: number): Promise<{
        messages: ChatMessage[];
        total: number;
    }>;
    findLastBySessionId(sessionId: string): Promise<ChatMessage | null>;
    findRecentByUserId(userId: string, limit?: number): Promise<ChatMessage[]>;
    findByRole(sessionId: string, role: 'user' | 'assistant' | 'system'): Promise<ChatMessage[]>;
    searchInSession(sessionId: string, query: string): Promise<ChatMessage[]>;
    findByDateRange(sessionId: string, startDate: Date, endDate: Date): Promise<ChatMessage[]>;
    countBySessionId(sessionId: string): Promise<number>;
    countByRole(sessionId: string, role: 'user' | 'assistant' | 'system'): Promise<number>;
    createMany(messagesData: Partial<ChatMessage>[]): Promise<ChatMessage[]>;
    deleteBySessionId(sessionId: string): Promise<void>;
    existsById(id: string): Promise<boolean>;
    belongsToSession(messageId: string, sessionId: string): Promise<boolean>;
}
