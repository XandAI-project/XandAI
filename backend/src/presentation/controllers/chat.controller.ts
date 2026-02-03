import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';

import { ChatUseCase } from '../../application/use-cases/chat.use-case';
import {
  CreateChatSessionDto,
  UpdateChatSessionDto,
  SendMessageDto,
  SendMessageResponseDto,
  ChatSessionResponseDto,
  ChatMessageResponseDto,
  SearchMessagesDto,
} from '../../application/dto/chat.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Controller responsável pelas operações de chat
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatUseCase: ChatUseCase) {}

  /**
   * Cria uma nova sessão de chat
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Request() req,
    @Body(ValidationPipe) createSessionDto: CreateChatSessionDto,
  ): Promise<ChatSessionResponseDto> {
    return await this.chatUseCase.createSession(req.user.id, createSessionDto);
  }

  /**
   * Obtém sessões do usuário
   */
  @Get('sessions')
  async getUserSessions(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ sessions: ChatSessionResponseDto[]; total: number }> {
    return await this.chatUseCase.getUserSessions(req.user.id, page, limit);
  }

  /**
   * Obtém uma sessão específica com mensagens
   */
  @Get('sessions/:sessionId')
  async getSessionWithMessages(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<ChatSessionResponseDto> {
    return await this.chatUseCase.getSessionWithMessages(req.user.id, sessionId);
  }

  /**
   * Atualiza uma sessão de chat
   */
  @Put('sessions/:sessionId')
  async updateSession(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(ValidationPipe) updateSessionDto: UpdateChatSessionDto,
  ): Promise<ChatSessionResponseDto> {
    return await this.chatUseCase.updateSession(req.user.id, sessionId, updateSessionDto);
  }

  /**
   * Arquiva uma sessão
   */
  @Put('sessions/:sessionId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveSession(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return await this.chatUseCase.archiveSession(req.user.id, sessionId);
  }

  /**
   * Deleta uma sessão (soft delete)
   */
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return await this.chatUseCase.deleteSession(req.user.id, sessionId);
  }

  /**
   * Limpa todas as mensagens de uma sessão (mantém a sessão)
   */
  @Delete('sessions/:sessionId/messages')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearSessionMessages(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return await this.chatUseCase.clearSessionMessages(req.user.id, sessionId);
  }

  /**
   * Envia uma mensagem e obtém resposta da IA
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    return await this.chatUseCase.sendMessage(req.user.id, sendMessageDto);
  }

  /**
   * Envia uma mensagem com streaming SSE
   */
  @Post('messages/stream')
  async sendMessageStream(
    @Request() req,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
      // Stream the response
      const result = await this.chatUseCase.sendMessageWithStreaming(
        req.user.id,
        sendMessageDto,
        (token: string, fullText: string) => {
          res.write(`data: ${JSON.stringify({ token, fullText, done: false })}\n\n`);
        }
      );

      // Check if this was an image generation (non-streamable)
      if (result && result.isImageGeneration) {
        // Send the full content and attachments at once
        res.write(`data: ${JSON.stringify({ 
          token: result.content, 
          fullText: result.content, 
          attachments: result.attachments,
          sessionId: result.sessionId,
          isImageGeneration: true,
          done: false 
        })}\n\n`);
      }

      // Send completion message with session ID and metadata so frontend can track conversation and display metrics
      res.write(`data: ${JSON.stringify({ 
        done: true, 
        sessionId: result?.sessionId,
        metadata: result?.metadata
      })}\n\n`);
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }

  /**
   * Envia uma mensagem com IA para uma sessão específica (incluindo histórico)
   */
  @Post('sessions/:sessionId/send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessageToSession(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(ValidationPipe) messageData: { 
      content: string; 
      model?: string; 
      temperature?: number;
      ollamaConfig?: {
        baseUrl?: string;
        timeout?: number;
        enabled?: boolean;
      };
    },
  ): Promise<{ userMessage: ChatMessageResponseDto; assistantMessage: ChatMessageResponseDto }> {
    const sendMessageDto: SendMessageDto = {
      sessionId,
      content: messageData.content,
      model: messageData.model,
      temperature: messageData.temperature,
      metadata: {
        ollamaConfig: messageData.ollamaConfig
      }
    };
    
    const response = await this.chatUseCase.sendMessage(req.user.id, sendMessageDto);
    return {
      userMessage: response.userMessage,
      assistantMessage: response.assistantMessage,
    };
  }

  /**
   * Adiciona uma mensagem a uma sessão específica
   */
  @Post('sessions/:sessionId/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessageToSession(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(ValidationPipe) messageData: { content: string; role: string },
  ): Promise<ChatMessageResponseDto> {
    return await this.chatUseCase.addMessageToSession(req.user.id, sessionId, messageData.content, messageData.role);
  }

  /**
   * Obtém mensagens de uma sessão
   */
  @Get('sessions/:sessionId/messages')
  async getSessionMessages(
    @Request() req,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<{ messages: ChatMessageResponseDto[]; total: number }> {
    return await this.chatUseCase.getSessionMessages(req.user.id, sessionId, page, limit);
  }

  /**
   * Obtém mensagens recentes do usuário
   */
  @Get('messages/recent')
  async getRecentMessages(
    @Request() req,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<{ messages: ChatMessageResponseDto[] }> {
    return await this.chatUseCase.getRecentMessages(req.user.id, limit);
  }

  /**
   * Busca mensagens
   */
  @Post('messages/search')
  async searchMessages(
    @Request() req,
    @Body(ValidationPipe) searchDto: SearchMessagesDto,
  ): Promise<ChatMessageResponseDto[]> {
    return await this.chatUseCase.searchMessages(req.user.id, searchDto);
  }

  /**
   * Cria ou atualiza uma mensagem com ID específico
   */
  @Put('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async createOrUpdateMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body(ValidationPipe) messageData: { 
      id: string;
      content: string; 
      role: string;
      chatSessionId?: string;
    },
  ): Promise<ChatMessageResponseDto> {
    return await this.chatUseCase.createOrUpdateMessage(req.user.id, messageId, messageData);
  }

  /**
   * Anexa uma imagem a uma mensagem específica
   */
  @Post('messages/:messageId/attachments/image')
  @HttpCode(HttpStatus.CREATED)
  async attachImageToMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body(ValidationPipe) attachmentData: { 
      imageUrl: string; 
      filename: string; 
      originalPrompt?: string; 
      metadata?: any 
    },
  ): Promise<ChatMessageResponseDto> {
    return await this.chatUseCase.attachImageToMessage(
      req.user.id, 
      messageId, 
      attachmentData.imageUrl, 
      attachmentData.filename, 
      attachmentData.originalPrompt,
      attachmentData.metadata
    );
  }

}
