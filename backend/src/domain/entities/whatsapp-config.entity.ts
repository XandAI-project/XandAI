import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from './user.entity';

/**
 * Configuração personalizada do WhatsApp para cada usuário
 */
@Entity('whatsapp_configs')
export class WhatsAppConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id', unique: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Configurações de Persona
  @Column({ type: 'varchar', default: 'friendly' })
  tone: string; // friendly, professional, casual, formal

  @Column({ type: 'varchar', default: 'conversational' })
  style: string; // conversational, concise, detailed, humorous

  @Column({ type: 'text', nullable: true })
  customInstructions: string; // Instruções personalizadas para a IA

  @Column({ type: 'varchar', default: 'pt-BR' })
  language: string;

  // Configurações de Auto-Reply
  @Column({ type: 'boolean', default: true })
  autoReplyEnabled: boolean;

  @Column({ type: 'integer', default: 2000 })
  responseDelayMs: number; // Delay humanizado (ms)

  @Column({ type: 'integer', default: 10000 })
  maxResponseDelayMs: number; // Delay máximo (ms)

  @Column({ type: 'boolean', default: true })
  useTypingIndicator: boolean; // Simular "digitando..."

  // Configurações de Segurança
  @Column({ type: 'json', nullable: true, default: () => "'[]'" })
  blockedContacts: string[]; // Lista de contatos bloqueados

  @Column({ type: 'json', nullable: true, default: () => "'[]'" })
  allowedContacts: string[]; // Lista de contatos permitidos (whitelist)

  @Column({ type: 'boolean', default: false })
  whitelistMode: boolean; // Se true, só responde para allowedContacts

  @Column({ type: 'json', nullable: true, default: () => "'[]'" })
  blockedKeywords: string[]; // Palavras-chave que disparam ignorar mensagem

  @Column({ type: 'boolean', default: true })
  ignoreGroups: boolean; // Ignorar mensagens de grupos (v1)

  @Column({ type: 'boolean', default: true })
  ignoreMedia: boolean; // Ignorar mensagens com mídia (v1)

  // Rate Limiting
  @Column({ type: 'integer', default: 30 })
  maxMessagesPerHour: number;

  @Column({ type: 'integer', default: 5 })
  maxMessagesPerChatPerHour: number;

  // Configurações de Modelo IA
  @Column({ type: 'varchar', default: 'llama3.2' })
  defaultModel: string;

  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({ type: 'integer', default: 500 })
  maxTokens: number;

  @Column({ type: 'integer', default: 10 })
  conversationContextLimit: number; // Quantas mensagens manter no contexto

  // Metadata adicional
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isContactAllowed(contactNumber: string): boolean {
    if (this.blockedContacts.includes(contactNumber)) {
      return false;
    }

    if (this.whitelistMode) {
      return this.allowedContacts.includes(contactNumber);
    }

    return true;
  }

  containsBlockedKeyword(message: string): boolean {
    if (!this.blockedKeywords || this.blockedKeywords.length === 0) {
      return false;
    }

    const lowerMessage = message.toLowerCase();
    return this.blockedKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  getRandomResponseDelay(): number {
    const min = this.responseDelayMs;
    const max = this.maxResponseDelayMs;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getPersonaInstructions(): string {
    let instructions = `You are responding as the user in a WhatsApp conversation. `;
    instructions += `Tone: ${this.tone}. `;
    instructions += `Style: ${this.style}. `;
    instructions += `Language: ${this.language}. `;
    
    if (this.customInstructions) {
      instructions += `\n\nAdditional instructions: ${this.customInstructions}`;
    }

    instructions += `\n\nIMPORTANT: Respond naturally and authentically as if you were the user. Keep responses conversational and appropriate for WhatsApp.`;
    
    return instructions;
  }
}
