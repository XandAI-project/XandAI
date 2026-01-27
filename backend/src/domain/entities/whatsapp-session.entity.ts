import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * Status da sessão WhatsApp
 */
export type WhatsAppSessionStatus = 'disconnected' | 'qr_pending' | 'authenticating' | 'connected' | 'paused' | 'error';

/**
 * Entidade WhatsAppSession - Representa uma sessão ativa de WhatsApp
 */
@Entity('whatsapp_sessions')
export class WhatsAppSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'varchar', length: 20, default: 'disconnected' })
  status: WhatsAppSessionStatus;

  @Column({ type: 'text', nullable: true })
  qrCode?: string;

  @Column({ type: 'boolean', default: true })
  autoReplyEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  isPaused: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    deviceInfo?: string;
    batteryLevel?: number;
    platform?: string;
    lastSeen?: Date;
    [key: string]: any;
  };

  @Column({ type: 'json', nullable: true })
  persona?: {
    name?: string;
    tone?: string;
    instructions?: string;
    safetyRules?: string[];
    responseDelay?: number; // ms delay for human-like responses
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  connectedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  disconnectedAt?: Date;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Métodos de negócio
  isConnected(): boolean {
    return this.status === 'connected';
  }

  canAutoReply(): boolean {
    return this.isConnected() && this.autoReplyEnabled && !this.isPaused;
  }

  updateStatus(newStatus: WhatsAppSessionStatus): void {
    this.status = newStatus;
    this.lastActivityAt = new Date();
    
    if (newStatus === 'connected') {
      this.connectedAt = new Date();
      this.disconnectedAt = null;
    } else if (newStatus === 'disconnected' || newStatus === 'error') {
      this.disconnectedAt = new Date();
    }
  }

  pause(): void {
    this.isPaused = true;
    this.lastActivityAt = new Date();
  }

  resume(): void {
    this.isPaused = false;
    this.lastActivityAt = new Date();
  }

  setError(error: string): void {
    this.status = 'error';
    this.lastError = error;
    this.lastActivityAt = new Date();
  }
}
