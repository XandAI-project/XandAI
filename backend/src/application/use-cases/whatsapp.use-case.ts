import { 
  Injectable, 
  Logger, 
  Inject, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { Message as WAMessage } from 'whatsapp-web.js';
import { WhatsAppService } from '../../infrastructure/services/whatsapp.service';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { IWhatsAppSessionRepository } from '../../domain/repositories/whatsapp-session.repository.interface';
import { IWhatsAppMessageRepository } from '../../domain/repositories/whatsapp-message.repository.interface';
import { IWhatsAppConfigRepository } from '../../domain/repositories/whatsapp-config.repository.interface';
import { WhatsAppSession } from '../../domain/entities/whatsapp-session.entity';
import { WhatsAppMessage } from '../../domain/entities/whatsapp-message.entity';
import { WhatsAppConfig } from '../../domain/entities/whatsapp-config.entity';
import {
  StartWhatsAppSessionDto,
  UpdateWhatsAppSessionDto,
  WhatsAppSessionResponseDto,
  WhatsAppQrCodeResponseDto,
  WhatsAppMessageResponseDto,
  WhatsAppConfigDto,
  WhatsAppConfigResponseDto,
  SendWhatsAppMessageDto,
  WhatsAppConnectionStatusDto
} from '../dto/whatsapp.dto';

/**
 * Use Case para operações do WhatsApp
 * Gerencia conexão, auto-reply e integração com IA
 */
@Injectable()
export class WhatsAppUseCase {
  private readonly logger = new Logger(WhatsAppUseCase.name);

  constructor(
    @Inject('IWhatsAppSessionRepository')
    private readonly sessionRepository: IWhatsAppSessionRepository,
    @Inject('IWhatsAppMessageRepository')
    private readonly messageRepository: IWhatsAppMessageRepository,
    @Inject('IWhatsAppConfigRepository')
    private readonly configRepository: IWhatsAppConfigRepository,
    private readonly whatsappService: WhatsAppService,
    private readonly ollamaService: OllamaService,
  ) {}

  /**
   * Inicia uma nova sessão WhatsApp e gera QR Code
   */
  async startSession(
    userId: string,
    dto: StartWhatsAppSessionDto
  ): Promise<WhatsAppQrCodeResponseDto> {
    this.logger.log(`🚀 Iniciando sessão WhatsApp para usuário: ${userId}`);

    try {
      // Verificar se já existe sessão ativa
      let session = await this.sessionRepository.findActiveByUserId(userId);
      
      if (session) {
        this.logger.log(`⚠️ Sessão ativa encontrada, desconectando...`);
        await this.disconnectSession(userId);
      }

      // Criar nova sessão no banco
      session = await this.sessionRepository.create({
        userId,
        status: 'disconnected',
        autoReplyEnabled: dto.autoReplyEnabled ?? true,
        isPaused: false,
        persona: dto.persona ? JSON.parse(dto.persona) : null,
      });

      // Garantir que existe configuração para o usuário
      let config = await this.configRepository.findByUserId(userId);
      if (!config) {
        config = await this.configRepository.createDefaultForUser(userId);
        this.logger.log(`✅ Configuração padrão criada para usuário: ${userId}`);
      }

      // Criar cliente WhatsApp
      const result = await this.whatsappService.createClient({
        sessionId: session.id,
        userId: userId,
        onQrCode: async (qrBase64) => {
          await this.sessionRepository.updateQrCode(session.id, qrBase64);
          this.logger.log(`📱 QR Code atualizado para sessão: ${session.id}`);
        },
        onReady: async (phoneNumber) => {
          await this.sessionRepository.markAsConnected(session.id, phoneNumber);
          this.logger.log(`🟢 Sessão conectada: ${phoneNumber}`);
        },
        onMessage: async (message) => {
          await this.handleIncomingMessage(session.id, message);
        },
        onDisconnected: async (reason) => {
          await this.sessionRepository.markAsDisconnected(session.id);
          this.logger.log(`🔴 Sessão desconectada: ${reason}`);
        },
        onAuthFailure: async (error) => {
          await this.sessionRepository.updateStatus(session.id, 'error');
          this.logger.error(`❌ Falha na autenticação: ${error}`);
        }
      });

      if (!result.success) {
        throw new BadRequestException(result.message);
      }

      return {
        sessionId: session.id,
        qrCode: '',
        status: 'qr_ready',
        message: 'Aguardando leitura do QR Code. Abra o WhatsApp no celular e escaneie o código.'
      };
    } catch (error) {
      this.logger.error(`Erro ao iniciar sessão WhatsApp: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtém o status da conexão WhatsApp
   */
  async getConnectionStatus(userId: string): Promise<WhatsAppConnectionStatusDto> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      return {
        isConnected: false,
        status: 'disconnected',
        autoReplyEnabled: false,
        isPaused: false
      };
    }

    const messageCount = await this.messageRepository.findBySessionId(session.id, 1, 1);

    return {
      isConnected: session.isActive(),
      status: session.status,
      phoneNumber: session.phoneNumber,
      lastActiveAt: session.lastActiveAt,
      autoReplyEnabled: session.autoReplyEnabled,
      isPaused: session.isPaused,
      messageCount: messageCount.total
    };
  }

  /**
   * Obtém QR Code de uma sessão
   */
  async getQrCode(userId: string): Promise<WhatsAppQrCodeResponseDto> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.status === 'connected') {
      return {
        sessionId: session.id,
        qrCode: '',
        status: 'connected',
        message: 'WhatsApp já está conectado'
      };
    }

    if (!session.qrCode) {
      return {
        sessionId: session.id,
        qrCode: '',
        status: session.status,
        message: 'QR Code ainda não foi gerado. Aguarde alguns segundos...'
      };
    }

    return {
      sessionId: session.id,
      qrCode: session.qrCode,
      status: session.status,
      message: 'Escaneie o QR Code com o WhatsApp'
    };
  }

  /**
   * Desconecta sessão WhatsApp
   */
  async disconnectSession(userId: string): Promise<void> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    this.logger.log(`🔴 Desconectando sessão: ${session.id}`);
    
    await this.whatsappService.disconnectClient(session.id);
    await this.sessionRepository.markAsDisconnected(session.id);
  }

  /**
   * Pausa/Retoma auto-reply (Kill Switch)
   */
  async togglePause(userId: string): Promise<WhatsAppSessionResponseDto> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    session.isPaused = !session.isPaused;
    const updated = await this.sessionRepository.update(session.id, { 
      isPaused: session.isPaused 
    });

    this.logger.log(`⏸️ Auto-reply ${session.isPaused ? 'PAUSADO' : 'RETOMADO'} para sessão: ${session.id}`);

    return this.mapSessionToDto(updated);
  }

  /**
   * Ativa/Desativa auto-reply
   */
  async toggleAutoReply(userId: string): Promise<WhatsAppSessionResponseDto> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    session.autoReplyEnabled = !session.autoReplyEnabled;
    const updated = await this.sessionRepository.update(session.id, {
      autoReplyEnabled: session.autoReplyEnabled
    });

    this.logger.log(`🤖 Auto-reply ${session.autoReplyEnabled ? 'ATIVADO' : 'DESATIVADO'} para sessão: ${session.id}`);

    return this.mapSessionToDto(updated);
  }

  /**
   * Atualiza configurações da sessão
   */
  async updateSession(
    userId: string,
    dto: UpdateWhatsAppSessionDto
  ): Promise<WhatsAppSessionResponseDto> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    const updated = await this.sessionRepository.update(session.id, dto);
    return this.mapSessionToDto(updated);
  }

  /**
   * Processa mensagem recebida e gera resposta automática
   */
  private async handleIncomingMessage(sessionId: string, waMessage: WAMessage): Promise<void> {
    try {
      this.logger.log(`📨 Processando mensagem: ${waMessage.id._serialized}`);

      // Buscar sessão
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        this.logger.error(`Sessão não encontrada: ${sessionId}`);
        return;
      }

      // Verificar se pode responder automaticamente
      if (!session.canAutoReply()) {
        this.logger.log(`⏭️ Auto-reply desabilitado ou pausado para sessão: ${sessionId}`);
        return;
      }

      // Buscar configurações
      const config = await this.configRepository.findByUserId(session.userId);
      if (!config) {
        this.logger.error(`Configuração não encontrada para usuário: ${session.userId}`);
        return;
      }

      // Verificar se já processamos esta mensagem (deduplicação)
      const existing = await this.messageRepository.findByWhatsappMessageId(waMessage.id._serialized);
      if (existing) {
        this.logger.debug(`⏭️ Mensagem já processada: ${waMessage.id._serialized}`);
        return;
      }

      // Obter informações do contato
      const contact = await waMessage.getContact();
      const chatId = waMessage.from;
      const contactNumber = contact.number || chatId.replace('@c.us', '');
      const contactName = contact.pushname || contact.name || 'Desconhecido';

      // Aplicar filtros de segurança
      if (!this.shouldProcessMessage(waMessage, config, contactNumber)) {
        this.logger.log(`🚫 Mensagem filtrada de ${contactName}`);
        
        // Salvar como ignorada
        const ignoredMessage = WhatsAppMessage.createIncoming({
          sessionId: session.id,
          whatsappMessageId: waMessage.id._serialized,
          chatId,
          contactName,
          contactNumber,
          content: waMessage.body,
          type: waMessage.type as any
        });
        
        const saved = await this.messageRepository.create(ignoredMessage);
        await this.messageRepository.update(saved.id, { status: 'ignored' });
        
        return;
      }

      // Verificar rate limiting
      const recentMessages = await this.messageRepository.countMessagesByChat(
        chatId,
        sessionId,
        1 // última hora
      );

      if (recentMessages >= config.maxMessagesPerChatPerHour) {
        this.logger.warn(`⏭️ Rate limit atingido para chat ${chatId}`);
        return;
      }

      // Salvar mensagem recebida
      const incomingMessageData = WhatsAppMessage.createIncoming({
        sessionId: session.id,
        whatsappMessageId: waMessage.id._serialized,
        chatId,
        contactName,
        contactNumber,
        content: waMessage.body,
        type: waMessage.type as any
      });

      const savedIncoming = await this.messageRepository.create(incomingMessageData);
      
      // Marcar como processando
      await this.messageRepository.update(savedIncoming.id, { status: 'processing' });

      // Buscar histórico de conversa
      const conversationHistory = await this.messageRepository.findByChatId(
        chatId,
        sessionId,
        config.conversationContextLimit
      );

      // Gerar resposta da IA
      const aiResponse = await this.generateAIResponse(
        waMessage.body,
        conversationHistory.reverse(), // Ordem cronológica
        config
      );

      // Aplicar delay humanizado
      const delay = config.getRandomResponseDelay();
      this.logger.log(`⏳ Aguardando ${delay}ms antes de responder...`);
      await this.sleep(delay);

      // Enviar resposta via WhatsApp
      const sendResult = await this.whatsappService.sendMessage(
        sessionId,
        chatId,
        aiResponse.content,
        {
          simulateTyping: config.useTypingIndicator,
          typingDurationMs: Math.min(delay, 5000),
          quotedMessageId: waMessage.id._serialized
        }
      );

      if (!sendResult.success) {
        throw new Error(sendResult.error);
      }

      // Salvar mensagem enviada
      const outgoingMessageData = WhatsAppMessage.createOutgoing({
        sessionId: session.id,
        whatsappMessageId: sendResult.messageId,
        chatId,
        content: aiResponse.content,
        inReplyToId: waMessage.id._serialized,
        metadata: aiResponse.metadata
      });

      const savedOutgoing = await this.messageRepository.create(outgoingMessageData);

      // Atualizar mensagem recebida como processada
      await this.messageRepository.markAsProcessed(savedIncoming.id, savedOutgoing.id);

      // Atualizar atividade da sessão
      await this.sessionRepository.update(sessionId, { lastActiveAt: new Date() });

      this.logger.log(`✅ Resposta enviada com sucesso para ${contactName}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao processar mensagem: ${error.message}`, error.stack);
    }
  }

  /**
   * Gera resposta da IA baseada no contexto
   */
  private async generateAIResponse(
    userMessage: string,
    conversationHistory: WhatsAppMessage[],
    config: WhatsAppConfig
  ): Promise<{ content: string; metadata: any }> {
    try {
      // Construir contexto da conversa
      let context = config.getPersonaInstructions() + '\n\n';
      context += 'Conversation history:\n';

      // Adicionar histórico
      conversationHistory.forEach(msg => {
        if (msg.direction === 'incoming') {
          context += `Contact: ${msg.content}\n`;
        } else {
          context += `You: ${msg.content}\n`;
        }
      });

      context += `\nContact: ${userMessage}\n`;
      context += `You:`;

      // Gerar resposta
      const response = await this.ollamaService.generateResponse(context, {
        model: config.defaultModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      });

      return {
        content: response.content,
        metadata: {
          model: response.model || config.defaultModel,
          tokens: response.tokens || 0,
          processingTime: response.processingTime || 0,
          temperature: config.temperature
        }
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar resposta IA: ${error.message}`);
      
      // Fallback simples
      return {
        content: 'Desculpe, estou com problemas técnicos no momento. Por favor, tente novamente mais tarde.',
        metadata: {
          model: 'fallback',
          error: true,
          errorMessage: error.message
        }
      };
    }
  }

  /**
   * Verifica se deve processar a mensagem (filtros de segurança)
   */
  private shouldProcessMessage(
    waMessage: WAMessage,
    config: WhatsAppConfig,
    contactNumber: string
  ): boolean {
    // Ignorar mensagens de grupos
    if (config.ignoreGroups && waMessage.from.includes('@g.us')) {
      return false;
    }

    // Ignorar mensagens com mídia
    if (config.ignoreMedia && waMessage.hasMedia) {
      return false;
    }

    // Verificar se contato está permitido
    if (!config.isContactAllowed(contactNumber)) {
      return false;
    }

    // Verificar palavras-chave bloqueadas
    if (config.containsBlockedKeyword(waMessage.body)) {
      return false;
    }

    // Apenas processar mensagens de texto
    if (waMessage.type !== 'chat') {
      return false;
    }

    return true;
  }

  /**
   * Obtém configuração do usuário
   */
  async getConfig(userId: string): Promise<WhatsAppConfigResponseDto> {
    let config = await this.configRepository.findByUserId(userId);

    if (!config) {
      config = await this.configRepository.createDefaultForUser(userId);
    }

    return this.mapConfigToDto(config);
  }

  /**
   * Atualiza configuração
   */
  async updateConfig(userId: string, dto: WhatsAppConfigDto): Promise<WhatsAppConfigResponseDto> {
    let config = await this.configRepository.findByUserId(userId);

    if (!config) {
      config = await this.configRepository.createDefaultForUser(userId);
    }

    const updated = await this.configRepository.update(config.id, dto);
    return this.mapConfigToDto(updated);
  }

  /**
   * Obtém mensagens da sessão
   */
  async getMessages(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: WhatsAppMessageResponseDto[]; total: number }> {
    const session = await this.sessionRepository.findByUserId(userId);

    if (!session) {
      return { messages: [], total: 0 };
    }

    const result = await this.messageRepository.findBySessionId(session.id, page, limit);

    return {
      messages: result.messages.map(m => this.mapMessageToDto(m)),
      total: result.total
    };
  }

  // Métodos auxiliares de mapeamento
  private mapSessionToDto(session: WhatsAppSession): WhatsAppSessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      phoneNumber: session.phoneNumber,
      status: session.status,
      qrCode: session.qrCode,
      autoReplyEnabled: session.autoReplyEnabled,
      isPaused: session.isPaused,
      persona: session.persona,
      lastActiveAt: session.lastActiveAt,
      connectedAt: session.connectedAt,
      disconnectedAt: session.disconnectedAt,
      metadata: session.metadata,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  private mapMessageToDto(message: WhatsAppMessage): WhatsAppMessageResponseDto {
    return {
      id: message.id,
      sessionId: message.sessionId,
      whatsappMessageId: message.whatsappMessageId,
      chatId: message.chatId,
      contactName: message.contactName,
      contactNumber: message.contactNumber,
      direction: message.direction,
      type: message.type,
      content: message.content,
      status: message.status,
      isAIGenerated: message.isAIGenerated,
      wasProcessed: message.wasProcessed,
      aiResponseId: message.aiResponseId,
      inReplyToId: message.inReplyToId,
      receivedAt: message.receivedAt,
      sentAt: message.sentAt,
      processedAt: message.processedAt,
      metadata: message.metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };
  }

  private mapConfigToDto(config: WhatsAppConfig): WhatsAppConfigResponseDto {
    return {
      id: config.id,
      userId: config.userId,
      tone: config.tone,
      style: config.style,
      customInstructions: config.customInstructions,
      language: config.language,
      autoReplyEnabled: config.autoReplyEnabled,
      responseDelayMs: config.responseDelayMs,
      maxResponseDelayMs: config.maxResponseDelayMs,
      useTypingIndicator: config.useTypingIndicator,
      blockedContacts: config.blockedContacts,
      allowedContacts: config.allowedContacts,
      whitelistMode: config.whitelistMode,
      blockedKeywords: config.blockedKeywords,
      ignoreGroups: config.ignoreGroups,
      ignoreMedia: config.ignoreMedia,
      maxMessagesPerHour: config.maxMessagesPerHour,
      maxMessagesPerChatPerHour: config.maxMessagesPerChatPerHour,
      defaultModel: config.defaultModel,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      conversationContextLimit: config.conversationContextLimit,
      metadata: config.metadata,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
