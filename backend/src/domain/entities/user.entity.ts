import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChatSession } from './chat-session.entity';

/**
 * Entidade User - Representa um usuÃ¡rio do sistema
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 255 })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, default: 'user' })
  role: 'user' | 'admin';

  @Column({ type: 'varchar', length: 10, nullable: true })
  preferredLanguage?: string;

  @Column({ type: 'varchar', length: 20, default: 'light' })
  theme: 'light' | 'dark';

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Column({ type: 'text', nullable: true })
  systemPrompt?: string;

  @Column({ type: 'json', nullable: true })
  llmConfig?: {
    temperature?: number;          // 0.0 - 2.0+
    maxTokens?: number;            // Max length of response
    topK?: number;                 // Top-K sampling
    topP?: number;                 // Top-P (nucleus) sampling (0.0 - 1.0)
    frequencyPenalty?: number;     // 0.0 - 2.0
    presencePenalty?: number;      // 0.0 - 2.0
    repeatPenalty?: number;        // Ollama specific
    seed?: number;                 // For reproducibility
  };

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => ChatSession, (chatSession) => chatSession.user)
  chatSessions: ChatSession[];

  // MÃ©todos de negÃ³cio
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  // MÃ©todo para serializaÃ§Ã£o (remove senha)
  toJSON() {
    const { password, ...result } = this;
    return result;
  }
}