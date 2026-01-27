import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, IsObject, IsEnum, Min, Max } from 'class-validator';
import { WhatsAppSessionStatus, WhatsAppMessageDirection, WhatsAppMessageStatus } from '../../domain/entities/whatsapp-session.entity';

/**
 * DTO para criar/iniciar sessão WhatsApp
 */
export class StartWhatsAppSessionDto {
  @IsOptional()
  @IsString()
  persona?: string;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean = true;
}

/**
 * DTO para atualizar configurações da sessão
 */
export class UpdateWhatsAppSessionDto {
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaused?: boolean;

  @IsOptional()
  @IsObject()
  persona?: {
    tone?: string;
    style?: string;
    customInstructions?: string;
    language?: string;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO de resposta da sessão WhatsApp
 */
export class WhatsAppSessionResponseDto {
  id: string;
  userId: string;
  phoneNumber?: string;
  status: WhatsAppSessionStatus;
  qrCode?: string;
  autoReplyEnabled: boolean;
  isPaused: boolean;
  persona?: any;
  lastActiveAt?: Date;
  connectedAt?: Date;
  disconnectedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO de resposta com QR Code
 */
export class WhatsAppQrCodeResponseDto {
  sessionId: string;
  qrCode: string;
  status: string;
  message: string;
}

/**
 * DTO de resposta da mensagem WhatsApp
 */
export class WhatsAppMessageResponseDto {
  id: string;
  sessionId: string;
  whatsappMessageId: string;
  chatId: string;
  contactName?: string;
  contactNumber?: string;
  direction: WhatsAppMessageDirection;
  type: string;
  content: string;
  status: WhatsAppMessageStatus;
  isAIGenerated: boolean;
  wasProcessed: boolean;
  aiResponseId?: string;
  inReplyToId?: string;
  receivedAt?: Date;
  sentAt?: Date;
  processedAt?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO para configuração WhatsApp
 */
export class WhatsAppConfigDto {
  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  customInstructions?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30000)
  responseDelayMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60000)
  maxResponseDelayMs?: number;

  @IsOptional()
  @IsBoolean()
  useTypingIndicator?: boolean;

  @IsOptional()
  @IsArray()
  blockedContacts?: string[];

  @IsOptional()
  @IsArray()
  allowedContacts?: string[];

  @IsOptional()
  @IsBoolean()
  whitelistMode?: boolean;

  @IsOptional()
  @IsArray()
  blockedKeywords?: string[];

  @IsOptional()
  @IsBoolean()
  ignoreGroups?: boolean;

  @IsOptional()
  @IsBoolean()
  ignoreMedia?: boolean;

  @IsOptional()
  @IsNumber()
  maxMessagesPerHour?: number;

  @IsOptional()
  @IsNumber()
  maxMessagesPerChatPerHour?: number;

  @IsOptional()
  @IsString()
  defaultModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  conversationContextLimit?: number;
}

/**
 * DTO de resposta da configuração WhatsApp
 */
export class WhatsAppConfigResponseDto {
  id: string;
  userId: string;
  tone: string;
  style: string;
  customInstructions?: string;
  language: string;
  autoReplyEnabled: boolean;
  responseDelayMs: number;
  maxResponseDelayMs: number;
  useTypingIndicator: boolean;
  blockedContacts: string[];
  allowedContacts: string[];
  whitelistMode: boolean;
  blockedKeywords: string[];
  ignoreGroups: boolean;
  ignoreMedia: boolean;
  maxMessagesPerHour: number;
  maxMessagesPerChatPerHour: number;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  conversationContextLimit: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO para enviar mensagem manual via WhatsApp
 */
export class SendWhatsAppMessageDto {
  @IsString()
  chatId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  bypassAI?: boolean; // Enviar sem processamento IA
}

/**
 * DTO de status da conexão
 */
export class WhatsAppConnectionStatusDto {
  isConnected: boolean;
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  lastActiveAt?: Date;
  autoReplyEnabled: boolean;
  isPaused: boolean;
  messageCount?: number;
}
