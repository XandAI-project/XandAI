import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, LocalAuth, Message as WAMessage, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { EventEmitter } from 'events';

export interface WhatsAppClientConfig {
  sessionId: string;
  userId: string;
  onQrCode?: (qr: string) => void;
  onReady?: (phoneNumber: string) => void;
  onMessage?: (message: WAMessage) => void;
  onDisconnected?: (reason: string) => void;
  onAuthFailure?: (error: string) => void;
}

/**
 * Serviço responsável pela integração com WhatsApp Web
 */
@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private clients: Map<string, Client> = new Map();
  private clientConfigs: Map<string, WhatsAppClientConfig> = new Map();
  private eventEmitters: Map<string, EventEmitter> = new Map();
  private messageDeduplication: Map<string, Set<string>> = new Map(); // sessionId -> Set<messageId>

  onModuleInit() {
    this.logger.log('🟢 WhatsApp Service initialized');
  }

  async onModuleDestroy() {
    this.logger.log('🔴 WhatsApp Service shutting down...');
    await this.disconnectAll();
  }

  /**
   * Cria e inicia um novo cliente WhatsApp
   */
  async createClient(config: WhatsAppClientConfig): Promise<{ success: boolean; message: string }> {
    const { sessionId } = config;

    // Se já existe um cliente, desconecta primeiro
    if (this.clients.has(sessionId)) {
      this.logger.log(`Cliente já existe para sessão ${sessionId}, desconectando...`);
      await this.disconnectClient(sessionId);
    }

    try {
      this.logger.log(`📱 Criando novo cliente WhatsApp para sessão: ${sessionId}`);

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: './whatsapp-sessions'
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      this.clients.set(sessionId, client);
      this.clientConfigs.set(sessionId, config);
      this.messageDeduplication.set(sessionId, new Set());

      const emitter = new EventEmitter();
      this.eventEmitters.set(sessionId, emitter);

      // Configurar event handlers
      this.setupClientHandlers(client, sessionId, config);

      // Inicializar cliente
      await client.initialize();

      return {
        success: true,
        message: 'Cliente WhatsApp criado com sucesso. Aguardando QR Code...'
      };
    } catch (error) {
      this.logger.error(`Erro ao criar cliente WhatsApp: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Erro ao criar cliente: ${error.message}`
      };
    }
  }

  /**
   * Configura os handlers de eventos do cliente
   */
  private setupClientHandlers(client: Client, sessionId: string, config: WhatsAppClientConfig) {
    const emitter = this.eventEmitters.get(sessionId);

    // QR Code gerado
    client.on('qr', async (qr) => {
      this.logger.log(`📱 QR Code gerado para sessão: ${sessionId}`);
      
      try {
        // Converte QR para base64
        const qrBase64 = await qrcode.toDataURL(qr);
        
        if (config.onQrCode) {
          config.onQrCode(qrBase64);
        }
        
        emitter?.emit('qr', qrBase64);
      } catch (error) {
        this.logger.error(`Erro ao gerar QR code: ${error.message}`);
      }
    });

    // Autenticado
    client.on('authenticated', () => {
      this.logger.log(`✅ Autenticado para sessão: ${sessionId}`);
      emitter?.emit('authenticated');
    });

    // Pronto para uso
    client.on('ready', async () => {
      this.logger.log(`🟢 Cliente pronto para sessão: ${sessionId}`);
      
      try {
        const info = client.info;
        const phoneNumber = info?.wid?.user || 'desconhecido';
        
        this.logger.log(`📞 Número conectado: ${phoneNumber}`);
        
        if (config.onReady) {
          config.onReady(phoneNumber);
        }
        
        emitter?.emit('ready', phoneNumber);
      } catch (error) {
        this.logger.error(`Erro ao obter informações do cliente: ${error.message}`);
      }
    });

    // Mensagem recebida
    client.on('message', async (message: WAMessage) => {
      try {
        // Verificar deduplicação
        const dedupSet = this.messageDeduplication.get(sessionId);
        if (dedupSet?.has(message.id._serialized)) {
          this.logger.debug(`⏭️ Mensagem duplicada ignorada: ${message.id._serialized}`);
          return;
        }

        // Adicionar ao set de deduplicação
        dedupSet?.add(message.id._serialized);
        
        // Limpar set periodicamente (manter últimas 1000 mensagens)
        if (dedupSet && dedupSet.size > 1000) {
          const arr = Array.from(dedupSet);
          dedupSet.clear();
          arr.slice(-500).forEach(id => dedupSet.add(id));
        }

        // Ignorar mensagens enviadas por nós mesmos
        if (message.fromMe) {
          this.logger.debug(`⏭️ Mensagem própria ignorada: ${message.id._serialized}`);
          return;
        }

        // Ignorar mensagens de grupos (v1)
        if (message.from.includes('@g.us')) {
          this.logger.debug(`⏭️ Mensagem de grupo ignorada: ${message.from}`);
          return;
        }

        this.logger.log(`📩 Nova mensagem recebida de ${message.from}: "${message.body.substring(0, 50)}..."`);
        
        if (config.onMessage) {
          config.onMessage(message);
        }
        
        emitter?.emit('message', message);
      } catch (error) {
        this.logger.error(`Erro ao processar mensagem: ${error.message}`, error.stack);
      }
    });

    // Desconectado
    client.on('disconnected', (reason) => {
      this.logger.warn(`🔴 Cliente desconectado para sessão ${sessionId}: ${reason}`);
      
      if (config.onDisconnected) {
        config.onDisconnected(reason);
      }
      
      emitter?.emit('disconnected', reason);
      
      // Limpar recursos
      this.clients.delete(sessionId);
      this.clientConfigs.delete(sessionId);
      this.messageDeduplication.delete(sessionId);
    });

    // Erro de autenticação
    client.on('auth_failure', (error: any) => {
      this.logger.error(`❌ Falha na autenticação para sessão ${sessionId}: ${error}`);
      
      if (config.onAuthFailure) {
        const errorMessage = typeof error === 'string' ? error : (error?.message || 'Falha na autenticação');
        config.onAuthFailure(errorMessage);
      }
      
      emitter?.emit('auth_failure', error);
    });

    // Change state
    client.on('change_state', (state) => {
      this.logger.debug(`State changed to: ${state}`);
    });

    // Loading screen
    client.on('loading_screen', (percent, message) => {
      this.logger.debug(`⏳ Carregando (${percent}%): ${message}`);
    });
  }

  /**
   * Envia uma mensagem via WhatsApp
   */
  async sendMessage(
    sessionId: string,
    chatId: string,
    message: string,
    options?: {
      quotedMessageId?: string;
      simulateTyping?: boolean;
      typingDurationMs?: number;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const client = this.clients.get(sessionId);

    if (!client) {
      return {
        success: false,
        error: 'Cliente não encontrado ou não conectado'
      };
    }

    try {
      // Simular digitação se configurado
      if (options?.simulateTyping) {
        const chat = await client.getChatById(chatId);
        await chat.sendStateTyping();
        
        // Aguardar tempo de digitação
        const typingDelay = options.typingDurationMs || 2000;
        await this.delay(typingDelay);
      }

      // Enviar mensagem
      const sentMessage = await client.sendMessage(chatId, message, {
        quotedMessageId: options?.quotedMessageId
      });

      this.logger.log(`✅ Mensagem enviada para ${chatId}: "${message.substring(0, 50)}..."`);

      return {
        success: true,
        messageId: sentMessage.id._serialized
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Desconecta um cliente específico
   */
  async disconnectClient(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);

    if (client) {
      this.logger.log(`🔴 Desconectando cliente para sessão: ${sessionId}`);
      
      try {
        await client.destroy();
      } catch (error) {
        this.logger.error(`Erro ao desconectar cliente: ${error.message}`);
      }

      this.clients.delete(sessionId);
      this.clientConfigs.delete(sessionId);
      this.eventEmitters.delete(sessionId);
      this.messageDeduplication.delete(sessionId);
    }
  }

  /**
   * Desconecta todos os clientes
   */
  async disconnectAll(): Promise<void> {
    const sessionIds = Array.from(this.clients.keys());
    
    for (const sessionId of sessionIds) {
      await this.disconnectClient(sessionId);
    }
  }

  /**
   * Verifica se um cliente está conectado
   */
  isConnected(sessionId: string): boolean {
    const client = this.clients.get(sessionId);
    return client?.info?.wid?.user != null;
  }

  /**
   * Obtém informações do cliente
   */
  async getClientInfo(sessionId: string): Promise<any> {
    const client = this.clients.get(sessionId);
    
    if (!client) {
      return null;
    }

    try {
      return {
        phoneNumber: client.info?.wid?.user,
        platform: client.info?.platform,
        pushname: client.info?.pushname,
        isConnected: this.isConnected(sessionId)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtém EventEmitter de um cliente para escutar eventos
   */
  getEventEmitter(sessionId: string): EventEmitter | undefined {
    return this.eventEmitters.get(sessionId);
  }

  /**
   * Obtém um cliente específico
   */
  getClient(sessionId: string): Client | undefined {
    return this.clients.get(sessionId);
  }

  /**
   * Delay auxiliar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Lista todos os chats
   */
  async getChats(sessionId: string): Promise<any[]> {
    const client = this.clients.get(sessionId);
    
    if (!client) {
      return [];
    }

    try {
      const chats = await client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        timestamp: chat.timestamp
      }));
    } catch (error) {
      this.logger.error(`Erro ao obter chats: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtém contato por ID
   */
  async getContact(sessionId: string, contactId: string): Promise<any> {
    const client = this.clients.get(sessionId);
    
    if (!client) {
      return null;
    }

    try {
      const contact = await client.getContactById(contactId);
      return {
        id: contact.id._serialized,
        name: contact.name || contact.pushname,
        number: contact.number,
        isMyContact: contact.isMyContact
      };
    } catch (error) {
      this.logger.error(`Erro ao obter contato: ${error.message}`);
      return null;
    }
  }
}
