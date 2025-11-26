import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';

/**
 * Entidade ChatMessage - Representa uma mensagem em uma sessão de chat
 */
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant' | 'system';

  @Column({ type: 'json', nullable: true })
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    temperature?: number;
    [key: string]: any;
  };

  @Column({ type: 'json', nullable: true })
  attachments?: {
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    filename: string;
    originalPrompt?: string;
    metadata?: any;
    [key: string]: any;
  }[];

  @Column({ type: 'varchar', length: 20, default: 'sent' })
  status: 'sent' | 'delivered' | 'error' | 'processing';

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @Column({ type: 'uuid' })
  chatSessionId: string;

  @ManyToOne(() => ChatSession, (chatSession) => chatSession.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatSessionId' })
  chatSession: ChatSession;

  // Métodos de negócio
  isUserMessage(): boolean {
    return this.role === 'user';
  }

  isAssistantMessage(): boolean {
    return this.role === 'assistant';
  }

  isSystemMessage(): boolean {
    return this.role === 'system';
  }

  markAsProcessing(): void {
    this.status = 'processing';
    this.processedAt = new Date();
  }

  markAsDelivered(): void {
    this.status = 'delivered';
    this.processedAt = new Date();
  }

  markAsError(errorMessage: string): void {
    this.status = 'error';
    this.error = errorMessage;
    this.processedAt = new Date();
  }

  getWordCount(): number {
    return this.content.split(/\s+/).filter(word => word.length > 0).length;
  }

  getCharacterCount(): number {
    return this.content.length;
  }

  truncate(maxLength: number = 100): string {
    if (this.content.length <= maxLength) {
      return this.content;
    }
    return this.content.substring(0, maxLength) + '...';
  }

  // Método para criar uma mensagem do usuário
  static createUserMessage(content: string, chatSessionId: string): ChatMessage {
    const message = new ChatMessage();
    message.content = content;
    message.role = 'user';
    message.chatSessionId = chatSessionId;
    message.status = 'sent';
    return message;
  }

  // Método para criar uma mensagem do assistente
  static createAssistantMessage(content: string, chatSessionId: string, metadata?: any): ChatMessage {
    const message = new ChatMessage();
    message.content = content;
    message.role = 'assistant';
    message.chatSessionId = chatSessionId;
    message.status = 'delivered';
    message.metadata = metadata;
    return message;
  }

  // Método para criar uma mensagem do sistema
  static createSystemMessage(content: string, chatSessionId: string): ChatMessage {
    const message = new ChatMessage();
    message.content = content;
    message.role = 'system';
    message.chatSessionId = chatSessionId;
    message.status = 'delivered';
    return message;
  }

  // Métodos para gerenciar anexos
  addAttachment(attachment: {
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    filename: string;
    originalPrompt?: string;
    metadata?: any;
  }): void {
    if (!this.attachments) {
      this.attachments = [];
    }
    this.attachments.push(attachment);
  }

  removeAttachment(filename: string): void {
    if (this.attachments) {
      this.attachments = this.attachments.filter(att => att.filename !== filename);
    }
  }

  getImageAttachments(): any[] {
    return this.attachments?.filter(att => att.type === 'image') || [];
  }

  hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  // Validações
  isValidContent(): boolean {
    return this.content && this.content.trim().length > 0;
  }

  isValidRole(): boolean {
    return ['user', 'assistant', 'system'].includes(this.role);
  }
}
