import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WhatsAppSession } from './whatsapp-session.entity';

/**
 * Entidade WhatsAppMessage - Representa mensagens interceptadas/enviadas via WhatsApp
 */
@Entity('whatsapp_messages')
export class WhatsAppMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  whatsappSessionId: string;

  @ManyToOne(() => WhatsAppSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'whatsappSessionId' })
  whatsappSession: WhatsAppSession;

  @Column({ type: 'varchar', length: 255 })
  chatId: string; // WhatsApp chat ID (phone number)

  @Column({ type: 'varchar', length: 255 })
  messageId: string; // WhatsApp message ID (for deduplication)

  @Column({ type: 'varchar', length: 20 })
  direction: 'incoming' | 'outgoing'; // incoming = received, outgoing = AI replied

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  senderName?: string;

  @Column({ type: 'boolean', default: false })
  isAIGenerated: boolean; // true if this is an AI auto-reply

  @Column({ type: 'boolean', default: false })
  wasRepliedTo: boolean; // true if incoming message got a reply

  @Column({ type: 'uuid', nullable: true })
  replyToMessageId?: string; // Reference to message this is replying to

  @Column({ type: 'json', nullable: true })
  metadata?: {
    processingTime?: number;
    model?: string;
    tokens?: number;
    aiPrompt?: string;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos estáticos de criação
  static createIncoming(
    whatsappSessionId: string,
    chatId: string,
    messageId: string,
    content: string,
    senderName?: string
  ): Partial<WhatsAppMessage> {
    return {
      whatsappSessionId,
      chatId,
      messageId,
      direction: 'incoming',
      content,
      senderName,
      isAIGenerated: false,
      wasRepliedTo: false,
      receivedAt: new Date(),
    };
  }

  static createOutgoing(
    whatsappSessionId: string,
    chatId: string,
    messageId: string,
    content: string,
    replyToMessageId?: string,
    metadata?: any
  ): Partial<WhatsAppMessage> {
    return {
      whatsappSessionId,
      chatId,
      messageId,
      direction: 'outgoing',
      content,
      isAIGenerated: true,
      replyToMessageId,
      metadata,
      sentAt: new Date(),
    };
  }
}
