import { Response } from 'express';
import { ChatUseCase } from '../../application/use-cases/chat.use-case';
import { CreateChatSessionDto, UpdateChatSessionDto, SendMessageDto, SendMessageResponseDto, ChatSessionResponseDto, ChatMessageResponseDto, SearchMessagesDto } from '../../application/dto/chat.dto';
export declare class ChatController {
    private readonly chatUseCase;
    constructor(chatUseCase: ChatUseCase);
    createSession(req: any, createSessionDto: CreateChatSessionDto): Promise<ChatSessionResponseDto>;
    getUserSessions(req: any, page: number, limit: number): Promise<{
        sessions: ChatSessionResponseDto[];
        total: number;
    }>;
    getSessionWithMessages(req: any, sessionId: string): Promise<ChatSessionResponseDto>;
    updateSession(req: any, sessionId: string, updateSessionDto: UpdateChatSessionDto): Promise<ChatSessionResponseDto>;
    archiveSession(req: any, sessionId: string): Promise<void>;
    deleteSession(req: any, sessionId: string): Promise<void>;
    sendMessage(req: any, sendMessageDto: SendMessageDto): Promise<SendMessageResponseDto>;
    sendMessageStream(req: any, sendMessageDto: SendMessageDto, res: Response): Promise<void>;
    sendMessageToSession(req: any, sessionId: string, messageData: {
        content: string;
        model?: string;
        temperature?: number;
        ollamaConfig?: {
            baseUrl?: string;
            timeout?: number;
            enabled?: boolean;
        };
    }): Promise<{
        userMessage: ChatMessageResponseDto;
        assistantMessage: ChatMessageResponseDto;
    }>;
    addMessageToSession(req: any, sessionId: string, messageData: {
        content: string;
        role: string;
    }): Promise<ChatMessageResponseDto>;
    getSessionMessages(req: any, sessionId: string, page: number, limit: number): Promise<{
        messages: ChatMessageResponseDto[];
        total: number;
    }>;
    getRecentMessages(req: any, limit: number): Promise<{
        messages: ChatMessageResponseDto[];
    }>;
    searchMessages(req: any, searchDto: SearchMessagesDto): Promise<ChatMessageResponseDto[]>;
    createOrUpdateMessage(req: any, messageId: string, messageData: {
        id: string;
        content: string;
        role: string;
        chatSessionId?: string;
    }): Promise<ChatMessageResponseDto>;
    attachImageToMessage(req: any, messageId: string, attachmentData: {
        imageUrl: string;
        filename: string;
        originalPrompt?: string;
        metadata?: any;
    }): Promise<ChatMessageResponseDto>;
}
