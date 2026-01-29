import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSession } from '../../domain/entities/whatsapp-session.entity';
import { IWhatsAppSessionRepository } from '../../domain/repositories/whatsapp-session.repository.interface';

@Injectable()
export class WhatsAppSessionRepository implements IWhatsAppSessionRepository {
  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly repository: Repository<WhatsAppSession>,
  ) {}

  async create(data: Partial<WhatsAppSession>): Promise<WhatsAppSession> {
    const session = this.repository.create(data);
    return await this.repository.save(session);
  }

  async findById(id: string): Promise<WhatsAppSession | null> {
    return await this.repository.findOne({ 
      where: { id },
      relations: ['user']
    });
  }

  async findByUserId(userId: string): Promise<WhatsAppSession | null> {
    return await this.repository.findOne({ 
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async findActiveByUserId(userId: string): Promise<WhatsAppSession | null> {
    return await this.repository.findOne({
      where: { 
        userId,
        status: 'connected' as any
      }
    });
  }

  async update(id: string, data: Partial<WhatsAppSession>): Promise<WhatsAppSession> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAll(): Promise<WhatsAppSession[]> {
    return await this.repository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findAllActive(): Promise<WhatsAppSession[]> {
    return await this.repository.find({
      where: { status: 'connected' as any }
    });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.repository.update(id, { 
      status: status as any,
      updatedAt: new Date()
    });
  }

  async updateQrCode(id: string, qrCode: string): Promise<void> {
    await this.repository.update(id, { 
      qrCode,
      status: 'qr_ready' as any,
      updatedAt: new Date()
    });
  }

  async markAsConnected(id: string, phoneNumber: string): Promise<void> {
    await this.repository.update(id, {
      status: 'connected' as any,
      phoneNumber,
      connectedAt: new Date(),
      lastActivityAt: new Date(),
      qrCode: null,
      updatedAt: new Date()
    });
  }

  async markAsDisconnected(id: string): Promise<void> {
    await this.repository.update(id, {
      status: 'disconnected' as any,
      disconnectedAt: new Date(),
      qrCode: null,
      updatedAt: new Date()
    });
  }
}
