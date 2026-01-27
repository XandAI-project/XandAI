import { WhatsAppConfig } from '../entities/whatsapp-config.entity';

/**
 * Interface do repositório de configurações WhatsApp
 */
export interface IWhatsAppConfigRepository {
  create(data: Partial<WhatsAppConfig>): Promise<WhatsAppConfig>;
  findById(id: string): Promise<WhatsAppConfig | null>;
  findByUserId(userId: string): Promise<WhatsAppConfig | null>;
  update(id: string, data: Partial<WhatsAppConfig>): Promise<WhatsAppConfig>;
  delete(id: string): Promise<void>;
  createDefaultForUser(userId: string): Promise<WhatsAppConfig>;
}
