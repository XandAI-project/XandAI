import { WhatsAppSession } from '../entities/whatsapp-session.entity';

/**
 * Interface do repositório de sessões WhatsApp
 */
export interface IWhatsAppSessionRepository {
  create(data: Partial<WhatsAppSession>): Promise<WhatsAppSession>;
  findById(id: string): Promise<WhatsAppSession | null>;
  findByUserId(userId: string): Promise<WhatsAppSession | null>;
  findActiveByUserId(userId: string): Promise<WhatsAppSession | null>;
  update(id: string, data: Partial<WhatsAppSession>): Promise<WhatsAppSession>;
  delete(id: string): Promise<void>;
  findAll(): Promise<WhatsAppSession[]>;
  findAllActive(): Promise<WhatsAppSession[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateQrCode(id: string, qrCode: string): Promise<void>;
  markAsConnected(id: string, phoneNumber: string): Promise<void>;
  markAsDisconnected(id: string): Promise<void>;
}
