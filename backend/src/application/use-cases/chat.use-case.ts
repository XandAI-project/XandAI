import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, Logger } from '@nestjs/common';

import { IChatSessionRepository } from '../../domain/repositories/chat-session.repository.interface';
import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { ChatSession } from '../../domain/entities/chat-session.entity';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';
import { 
  CreateChatSessionDto, 
  UpdateChatSessionDto, 
  CreateChatMessageDto, 
  SendMessageDto,
  SendMessageResponseDto,
  ChatSessionResponseDto,
  ChatMessageResponseDto,
  SearchMessagesDto
} from '../dto/chat.dto';

/**
 * Use Case para operações de chat
 */
@Injectable()
export class ChatUseCase {
  private readonly logger = new Logger(ChatUseCase.name);

  constructor(
    @Inject('IChatSessionRepository')
    private readonly chatSessionRepository: IChatSessionRepository,
    @Inject('IChatMessageRepository')
    private readonly chatMessageRepository: IChatMessageRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly ollamaService: OllamaService,
    private readonly stableDiffusionService: StableDiffusionService,
  ) {}

  /**
   * Cria uma nova sessão de chat
   */
  async createSession(userId: string, createSessionDto: CreateChatSessionDto): Promise<ChatSessionResponseDto> {
    // Verifica se o usuário existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const sessionData: Partial<ChatSession> = {
      userId,
      title: createSessionDto.title || 'Nova Conversa',
      description: createSessionDto.description,
      metadata: createSessionDto.metadata,
      status: 'active',
      lastActivityAt: new Date(),
    };

    const session = await this.chatSessionRepository.create(sessionData);
    return this.mapSessionToDto(session);
  }

  /**
   * Obtém sessões do usuário
   */
  async getUserSessions(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ sessions: ChatSessionResponseDto[]; total: number }> {
    const { sessions, total } = await this.chatSessionRepository.findByUserId(userId, page, limit);
    
    return {
      sessions: sessions.map(session => this.mapSessionToDto(session)),
      total,
    };
  }

  /**
   * Obtém uma sessão específica com mensagens
   */
  async getSessionWithMessages(userId: string, sessionId: string): Promise<ChatSessionResponseDto> {
    const session = await this.chatSessionRepository.findWithMessages(sessionId);
    
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Verifica se a sessão pertence ao usuário
    if (session.userId !== userId) {
      throw new ForbiddenException('Acesso negado à sessão');
    }

    // Garantir que as mensagens estejam ordenadas cronologicamente (ASC)
    if (session.messages && session.messages.length > 0) {
      session.messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return this.mapSessionToDto(session, true);
  }

  /**
   * Atualiza uma sessão de chat
   */
  async updateSession(
    userId: string, 
    sessionId: string, 
    updateSessionDto: UpdateChatSessionDto
  ): Promise<ChatSessionResponseDto> {
    const session = await this.chatSessionRepository.findById(sessionId);
    
    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Acesso negado à sessão');
    }

    const updatedSession = await this.chatSessionRepository.update(sessionId, updateSessionDto);
    return this.mapSessionToDto(updatedSession);
  }

  /**
   * Arquiva uma sessão
   */
  async archiveSession(userId: string, sessionId: string): Promise<void> {
    const belongsToUser = await this.chatSessionRepository.belongsToUser(sessionId, userId);
    
    if (!belongsToUser) {
      throw new ForbiddenException('Acesso negado à sessão');
    }

    await this.chatSessionRepository.archive(sessionId);
  }

  /**
   * Deleta uma sessão (soft delete)
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const belongsToUser = await this.chatSessionRepository.belongsToUser(sessionId, userId);
    
    if (!belongsToUser) {
      throw new ForbiddenException('Acesso negado à sessão');
    }

    await this.chatSessionRepository.softDelete(sessionId);
  }

  /**
   * Envia uma mensagem e obtém resposta da IA
   */
  async sendMessage(userId: string, sendMessageDto: SendMessageDto): Promise<SendMessageResponseDto> {
    let session: ChatSession;

    // Se não foi fornecido sessionId, cria uma nova sessão
    if (!sendMessageDto.sessionId) {
      const newSessionData: Partial<ChatSession> = {
        userId,
        title: this.generateSessionTitle(sendMessageDto.content),
        status: 'active',
        lastActivityAt: new Date(),
        metadata: {
          model: sendMessageDto.model,
          temperature: sendMessageDto.temperature,
          maxTokens: sendMessageDto.maxTokens,
          ...sendMessageDto.metadata,
        },
      };

      session = await this.chatSessionRepository.create(newSessionData);
    } else {
      // Verifica se a sessão existe e pertence ao usuário
      session = await this.chatSessionRepository.findById(sendMessageDto.sessionId);
      
      if (!session) {
        throw new NotFoundException('Sessão não encontrada');
      }

      if (session.userId !== userId) {
        throw new ForbiddenException('Acesso negado à sessão');
      }

      // Atualiza atividade da sessão
      session.updateActivity();
      await this.chatSessionRepository.update(session.id, { lastActivityAt: session.lastActivityAt });
    }

    // Cria mensagem do usuário
    const userMessageData = ChatMessage.createUserMessage(sendMessageDto.content, session.id);
    const userMessage = await this.chatMessageRepository.create(userMessageData);

    // Busca o histórico de mensagens da sessão para contexto
    const messageHistory = await this.chatMessageRepository.findBySessionId(session.id, 1, 50);
    
    // Integra com o serviço de IA (Ollama) incluindo histórico
    const aiResponse = await this.generateAIResponse(sendMessageDto.content, sendMessageDto, messageHistory.messages);
    
    const assistantMessageData = ChatMessage.createAssistantMessage(
      aiResponse.content, 
      session.id, 
      aiResponse.metadata
    );
    
    // Add attachments if present (e.g., generated images)
    if (aiResponse.attachments && aiResponse.attachments.length > 0) {
      assistantMessageData.attachments = aiResponse.attachments;
    }
    
    const assistantMessage = await this.chatMessageRepository.create(assistantMessageData);

    return {
      userMessage: this.mapMessageToDto(userMessage),
      assistantMessage: this.mapMessageWithAttachmentsToDto(assistantMessage),
      session: this.mapSessionToDto(session),
    };
  }

  /**
   * Obtém mensagens de uma sessão
   */
  async getSessionMessages(
    userId: string, 
    sessionId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ messages: ChatMessageResponseDto[]; total: number }> {
    // Verifica se a sessão pertence ao usuário
    const belongsToUser = await this.chatSessionRepository.belongsToUser(sessionId, userId);
    
    if (!belongsToUser) {
      throw new ForbiddenException('Acesso negado à sessão');
    }

    const { messages, total } = await this.chatMessageRepository.findBySessionId(sessionId, page, limit);
    
    return {
      messages: messages.map(message => this.mapMessageWithAttachmentsToDto(message)),
      total,
    };
  }

  /**
   * Obtém mensagens recentes do usuário
   */
  async getRecentMessages(userId: string, limit: number = 50): Promise<{ messages: ChatMessageResponseDto[] }> {
    const messages = await this.chatMessageRepository.findRecentByUserId(userId, limit);
    
    return {
      messages: messages.map(message => this.mapMessageWithAttachmentsToDto(message)),
    };
  }

  /**
   * Busca mensagens
   */
  async searchMessages(userId: string, searchDto: SearchMessagesDto): Promise<ChatMessageResponseDto[]> {
    if (searchDto.sessionId) {
      // Verifica se a sessão pertence ao usuário
      const belongsToUser = await this.chatSessionRepository.belongsToUser(searchDto.sessionId, userId);
      
      if (!belongsToUser) {
        throw new ForbiddenException('Acesso negado à sessão');
      }

      const messages = await this.chatMessageRepository.searchInSession(searchDto.sessionId, searchDto.query);
      return messages.map(message => this.mapMessageToDto(message));
    }

    // TODO: Implementar busca geral nas sessões do usuário
    throw new BadRequestException('Busca geral ainda não implementada');
  }

  /**
   * Gera resposta da IA, incluindo detecção de pedidos de imagem
   */
  private async generateAIResponse(
    userMessage: string, 
    options: SendMessageDto,
    messageHistory: ChatMessage[] = []
  ): Promise<{ content: string; metadata: any; attachments?: any[] }> {
    try {
      // Check if this is an image generation request
      const isImageRequest = this.ollamaService.isImageGenerationRequest(userMessage);
      
      if (isImageRequest) {
        return await this.handleImageGenerationRequest(userMessage, options);
      }

      // Regular text response
      // Prepara o contexto da conversa incluindo histórico
      const context = this.buildConversationContext(messageHistory, userMessage);
      
      // Chama o serviço Ollama com configuração dinâmica
      const response = await this.ollamaService.generateResponse(context, {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ollamaConfig: options.metadata?.ollamaConfig,
        ...options.metadata
      });

      return {
        content: response.content,
        metadata: {
          model: response.model || options.model || 'llama3.2',
          temperature: options.temperature || 0.7,
          tokens: response.tokens || 0,
          processingTime: response.processingTime || 0,
          usedHistory: messageHistory.length > 0
        }
      };
    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error);
      
      // Fallback para resposta simulada em caso de erro
      const fallbackResponses = [
        'Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.',
        'Ocorreu um problema temporário. Por favor, reformule sua pergunta.',
        'Estou passando por algumas dificuldades técnicas. Tente novamente.'
      ];

      return {
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        metadata: {
          model: 'fallback',
          error: true,
          originalError: error.message,
          usedHistory: false
        }
      };
    }
  }

  /**
   * Handles image generation requests
   */
  private async handleImageGenerationRequest(
    userMessage: string,
    options: SendMessageDto
  ): Promise<{ content: string; metadata: any; attachments?: any[] }> {
    this.logger.log(`Processing image generation request: "${userMessage.substring(0, 50)}..."`);

    // Check if SD is available
    const sdStatus = this.stableDiffusionService.getConfigStatus();
    this.logger.log(`SD Status: enabled=${sdStatus.enabled}, available=${sdStatus.available}, baseUrl=${sdStatus.baseUrl}, model=${sdStatus.defaultModel}`);
    
    // Try to connect even if not marked as enabled (auto-detect)
    if (!sdStatus.enabled && !sdStatus.available) {
      // Try to auto-detect Forge
      this.logger.log('SD not enabled, trying to auto-detect Forge...');
      try {
        const testResult = await this.stableDiffusionService.testConnection(sdStatus.baseUrl);
        if (!testResult.success) {
          return {
            content: '🎨 I detected you want an image, but Stable Diffusion is not available. Please ensure Forge is running and configured.',
            metadata: {
              model: 'system',
              imageGeneration: false,
              reason: 'SD not available',
              testResult
            }
          };
        }
        this.logger.log('Forge auto-detected successfully!');
      } catch (e) {
        return {
          content: '🎨 I detected you want an image, but could not connect to Stable Diffusion. Please check the Forge server.',
          metadata: {
            model: 'system',
            imageGeneration: false,
            reason: 'SD connection failed',
            error: e.message
          }
        };
      }
    }

    try {
      // Generate optimized SD prompt using Ollama
      this.logger.log('Generating optimized SD prompt...');
      const promptData = await this.ollamaService.generateImagePrompt(userMessage);
      
      this.logger.log(`SD Prompt: "${promptData.prompt.substring(0, 100)}..."`);
      this.logger.log(`Negative: "${promptData.negativePrompt.substring(0, 50)}..."`);

      // Generate image with Stable Diffusion
      this.logger.log('Calling Stable Diffusion...');
      const result = await this.stableDiffusionService.generateImage({
        prompt: promptData.prompt,
        negativePrompt: promptData.negativePrompt,
        config: {
          baseUrl: sdStatus.baseUrl,
          model: sdStatus.defaultModel,
          enabled: true,
          width: 1024,
          height: 1024,
          steps: 25,
          cfgScale: 7,
        }
      });

      if (result.success && result.imageUrl) {
        this.logger.log(`Image generated successfully: ${result.filename}`);
        
        return {
          content: `🎨 Here's the image I generated for you!\n\n**Prompt used:** ${promptData.prompt.substring(0, 200)}${promptData.prompt.length > 200 ? '...' : ''}`,
          metadata: {
            model: 'stable-diffusion',
            imageGeneration: true,
            sdModel: sdStatus.defaultModel,
            prompt: promptData.prompt,
            negativePrompt: promptData.negativePrompt,
            processingTime: result.metadata?.processingTime || 0,
          },
          attachments: [{
            type: 'image',
            url: result.imageUrl,
            filename: result.filename,
            originalPrompt: promptData.prompt,
            metadata: result.metadata
          }]
        };
      } else {
        throw new Error(result.error || 'Unknown image generation error');
      }

    } catch (error) {
      this.logger.error(`Image generation failed: ${error.message}`);
      
      return {
        content: `🎨 I tried to generate an image for you, but encountered an error: ${error.message}\n\nPlease try again or rephrase your request.`,
        metadata: {
          model: 'stable-diffusion',
          imageGeneration: false,
          error: true,
          errorMessage: error.message
        }
      };
    }
  }

  /**
   * Constrói o contexto da conversa incluindo histórico
   */
  private buildConversationContext(messageHistory: ChatMessage[], currentMessage: string): string {
    let context = '';
    
    // Se há histórico, inclui as mensagens anteriores
    if (messageHistory.length > 0) {
      // Ordena mensagens por data (mais antigas primeiro)
      const sortedHistory = messageHistory.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Inclui apenas as últimas 10 mensagens para não sobrecarregar o contexto
      const recentMessages = sortedHistory.slice(-10);
      
      // Monta o contexto em formato de conversa natural
      recentMessages.forEach(msg => {
        if (msg.role === 'user') {
          context += `Usuário: ${msg.content}\n\n`;
        } else {
          context += `Resposta: ${msg.content}\n\n`;
        }
      });
    }
    
    // Adiciona a mensagem atual
    context += `Usuário: ${currentMessage}\n\nPor favor, responda diretamente sem prefixos:`;
    
    return context;
  }

  /**
   * Gera título para a sessão baseado na primeira mensagem
   */
  private generateSessionTitle(firstMessage: string): string {
    const words = firstMessage.split(' ').slice(0, 5);
    return words.join(' ') + (firstMessage.split(' ').length > 5 ? '...' : '');
  }

  /**
   * Mapeia sessão para DTO
   */
  private mapSessionToDto(session: ChatSession, includeMessages: boolean = false): ChatSessionResponseDto {
    const dto: ChatSessionResponseDto = {
      id: session.id,
      title: session.title,
      description: session.description,
      status: session.status,
      metadata: session.metadata,
      messageCount: session.getMessageCount(),
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    if (includeMessages && session.messages) {
      dto.messages = session.messages.map(message => this.mapMessageToDto(message));
    }

    return dto;
  }

  /**
   * Mapeia mensagem para DTO
   */
  private mapMessageToDto(message: ChatMessage): ChatMessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      role: message.role,
      status: message.status,
      metadata: message.metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Adiciona uma mensagem a uma sessão específica
   */
  async addMessageToSession(
    userId: string, 
    sessionId: string, 
    content: string, 
    role: string
  ): Promise<ChatMessageResponseDto> {
    // Verifica se a sessão existe e pertence ao usuário
    const session = await this.chatSessionRepository.findByIdAndUserId(sessionId, userId);
    if (!session) {
      throw new NotFoundException('Sessão não encontrada ou não autorizada');
    }

    // Valida o role
    if (!['user', 'assistant'].includes(role)) {
      throw new BadRequestException('Role deve ser "user" ou "assistant"');
    }

    // Cria a mensagem
    const messageData: Partial<ChatMessage> = {
      chatSessionId: sessionId,
      content,
      role: role as 'user' | 'assistant',
      status: 'sent',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const message = await this.chatMessageRepository.create(messageData);

    // Se é a primeira mensagem do usuário e a sessão tem título padrão, gera um novo título
    if (role === 'user' && (session.title === 'Nova Conversa' || !session.title)) {
      this.generateTitleForSession(sessionId, content).catch(error => {
        console.error('Erro ao gerar título da sessão:', error);
        // Não falha se a geração de título der erro
      });
    }

    // Atualiza a atividade da sessão
    await this.chatSessionRepository.updateLastActivity(sessionId);

    return {
      id: message.id,
      content: message.content,
      role: message.role,
      status: message.status,
      metadata: message.metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Cria ou atualiza uma mensagem com ID específico
   */
  async createOrUpdateMessage(
    userId: string,
    messageId: string,
    messageData: { id: string; content: string; role: string; chatSessionId?: string }
  ): Promise<ChatMessageResponseDto> {
    // Busca ou cria uma sessão
    let sessionId = messageData.chatSessionId;
    if (!sessionId) {
      const sessions = await this.chatSessionRepository.findByUserId(userId, 1, 1);
      if (sessions.sessions.length > 0) {
        sessionId = sessions.sessions[0].id;
      } else {
        const newSession = await this.chatSessionRepository.create({
          title: 'Nova Conversa',
          description: 'Sessão criada automaticamente',
          userId: userId,
          status: 'active'
        });
        sessionId = newSession.id;
      }
    }

    // Verifica se a mensagem já existe
    let message = await this.chatMessageRepository.findById(messageId);
    
    if (message) {
      // Atualiza mensagem existente
      message = await this.chatMessageRepository.update(messageId, {
        content: messageData.content,
        role: messageData.role as 'user' | 'assistant' | 'system'
      });
    } else {
      // Cria nova mensagem
      message = await this.chatMessageRepository.create({
        id: messageId,
        content: messageData.content,
        role: messageData.role as 'user' | 'assistant' | 'system',
        chatSessionId: sessionId,
        status: 'delivered'
      });
    }

    return this.mapMessageWithAttachmentsToDto(message);
  }

  /**
   * Anexa uma imagem a uma mensagem específica
   */
  async attachImageToMessage(
    userId: string,
    messageId: string,
    imageUrl: string,
    filename: string,
    originalPrompt?: string,
    metadata?: any
  ): Promise<ChatMessageResponseDto> {
    // Busca a mensagem existente ou cria se não existir
    let message = await this.chatMessageRepository.findById(messageId);
    if (!message) {
      // Busca ou cria uma sessão para o usuário
      const sessions = await this.chatSessionRepository.findByUserId(userId, 1, 1);
      let sessionId;
      
      if (sessions.sessions.length > 0) {
        sessionId = sessions.sessions[0].id;
      } else {
        // Cria uma nova sessão
        const newSession = await this.chatSessionRepository.create({
          title: 'Nova Conversa',
          description: 'Sessão criada automaticamente',
          userId: userId,
          status: 'active'
        });
        sessionId = newSession.id;
      }
      
      // Cria a mensagem
      message = await this.chatMessageRepository.create({
        id: messageId,
        content: 'Resposta com imagem gerada',
        role: 'assistant',
        chatSessionId: sessionId,
        status: 'delivered'
      });
    }

    // Verifica se a mensagem pertence a uma sessão do usuário
    const session = await this.chatSessionRepository.findByIdAndUserId(message.chatSessionId, userId);
    if (!session) {
      throw new ForbiddenException('Você não tem permissão para anexar imagens nesta mensagem');
    }

    // Adiciona o anexo à mensagem
    message.addAttachment({
      type: 'image',
      url: imageUrl,
      filename: filename,
      originalPrompt: originalPrompt,
      metadata: metadata
    });

    // Salva a mensagem atualizada
    const updatedMessage = await this.chatMessageRepository.update(messageId, {
      attachments: message.attachments
    });

    return this.mapMessageWithAttachmentsToDto(updatedMessage);
  }

  /**
   * Mapeia entidade para DTO (incluindo anexos)
   */
  private mapMessageWithAttachmentsToDto(message: ChatMessage): ChatMessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      role: message.role,
      status: message.status,
      metadata: message.metadata,
      attachments: message.attachments,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Gera um título para a sessão baseado na primeira mensagem do usuário
   * @private
   */
  private async generateTitleForSession(sessionId: string, firstUserMessage: string): Promise<void> {
    try {
      // Gera o título usando Ollama
      const generatedTitle = await this.ollamaService.generateConversationTitle(firstUserMessage);
      
      // Atualiza a sessão com o novo título
      await this.chatSessionRepository.update(sessionId, {
        title: generatedTitle,
        updatedAt: new Date(),
      });

      console.log(`Título gerado para sessão ${sessionId}: "${generatedTitle}"`);
    } catch (error) {
      console.error('Erro ao gerar título:', error);
      // Em caso de erro, não atualiza o título (mantém o padrão)
    }
  }

  }
