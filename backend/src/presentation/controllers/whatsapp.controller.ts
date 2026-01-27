import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { WhatsAppUseCase } from '../../application/use-cases/whatsapp.use-case';
import {
  StartWhatsAppSessionDto,
  UpdateWhatsAppSessionDto,
  WhatsAppConfigDto,
  SendWhatsAppMessageDto
} from '../../application/dto/whatsapp.dto';

/**
 * Controller para operações do WhatsApp
 */
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsappUseCase: WhatsAppUseCase) {}

  /**
   * Inicia sessão WhatsApp e gera QR Code
   * POST /whatsapp/start
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startSession(
    @Request() req,
    @Body() dto: StartWhatsAppSessionDto
  ) {
    const userId = req.user.userId;
    this.logger.log(`🚀 Iniciando sessão WhatsApp para usuário: ${userId}`);
    return await this.whatsappUseCase.startSession(userId, dto);
  }

  /**
   * Obtém status da conexão WhatsApp
   * GET /whatsapp/status
   */
  @Get('status')
  async getStatus(@Request() req) {
    const userId = req.user.userId;
    return await this.whatsappUseCase.getConnectionStatus(userId);
  }

  /**
   * Obtém QR Code atual
   * GET /whatsapp/qr
   */
  @Get('qr')
  async getQrCode(@Request() req) {
    const userId = req.user.userId;
    return await this.whatsappUseCase.getQrCode(userId);
  }

  /**
   * Desconecta sessão WhatsApp
   * POST /whatsapp/disconnect
   */
  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Request() req) {
    const userId = req.user.userId;
    this.logger.log(`🔴 Desconectando WhatsApp para usuário: ${userId}`);
    await this.whatsappUseCase.disconnectSession(userId);
    return { message: 'Desconectado com sucesso' };
  }

  /**
   * Pausa/Retoma auto-reply (Kill Switch)
   * POST /whatsapp/toggle-pause
   */
  @Post('toggle-pause')
  @HttpCode(HttpStatus.OK)
  async togglePause(@Request() req) {
    const userId = req.user.userId;
    this.logger.log(`⏸️ Toggle pause para usuário: ${userId}`);
    return await this.whatsappUseCase.togglePause(userId);
  }

  /**
   * Ativa/Desativa auto-reply
   * POST /whatsapp/toggle-auto-reply
   */
  @Post('toggle-auto-reply')
  @HttpCode(HttpStatus.OK)
  async toggleAutoReply(@Request() req) {
    const userId = req.user.userId;
    this.logger.log(`🤖 Toggle auto-reply para usuário: ${userId}`);
    return await this.whatsappUseCase.toggleAutoReply(userId);
  }

  /**
   * Atualiza sessão WhatsApp
   * PUT /whatsapp/session
   */
  @Put('session')
  async updateSession(
    @Request() req,
    @Body() dto: UpdateWhatsAppSessionDto
  ) {
    const userId = req.user.userId;
    return await this.whatsappUseCase.updateSession(userId, dto);
  }

  /**
   * Obtém configurações WhatsApp
   * GET /whatsapp/config
   */
  @Get('config')
  async getConfig(@Request() req) {
    const userId = req.user.userId;
    return await this.whatsappUseCase.getConfig(userId);
  }

  /**
   * Atualiza configurações WhatsApp
   * PUT /whatsapp/config
   */
  @Put('config')
  async updateConfig(
    @Request() req,
    @Body() dto: WhatsAppConfigDto
  ) {
    const userId = req.user.userId;
    this.logger.log(`⚙️ Atualizando configurações WhatsApp para usuário: ${userId}`);
    return await this.whatsappUseCase.updateConfig(userId, dto);
  }

  /**
   * Obtém mensagens WhatsApp
   * GET /whatsapp/messages
   */
  @Get('messages')
  async getMessages(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    const userId = req.user.userId;
    return await this.whatsappUseCase.getMessages(
      userId,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 50
    );
  }
}
