import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChatSession } from './chat-session.entity';

/**
 * Entidade User - Representa um usuário do sistema
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

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => ChatSession, (chatSession) => chatSession.user)
  chatSessions: ChatSession[];

  // Métodos de negócio
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  // Método para serialização (remove senha)
  toJSON() {
    const { password, ...result } = this;
    return result;
  }
}
