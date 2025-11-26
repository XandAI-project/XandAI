import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ChatMessage } from './chat-message.entity';

/**
 * Entidade ChatSession - Representa uma sessão de chat
 */
@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'archived' | 'deleted';

  @Column({ type: 'json', nullable: true })
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.chatSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => ChatMessage, (message) => message.chatSession)
  messages: ChatMessage[];

  // Métodos de negócio
  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  getMessageCount(): number {
    return this.messages?.length || 0;
  }

  generateTitle(firstMessage?: string): string {
    if (firstMessage && firstMessage.length > 0) {
      const words = firstMessage.split(' ').slice(0, 5);
      return words.join(' ') + (firstMessage.split(' ').length > 5 ? '...' : '');
    }
    return `Chat ${new Date().toLocaleDateString('pt-BR')}`;
  }

  archive(): void {
    this.status = 'archived';
  }

  activate(): void {
    this.status = 'active';
  }

  softDelete(): void {
    this.status = 'deleted';
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isArchived(): boolean {
    return this.status === 'archived';
  }

  isDeleted(): boolean {
    return this.status === 'deleted';
  }
}
