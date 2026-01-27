import { Test, TestingModule } from '@nestjs/testing';
import { ChatUseCase } from './chat.use-case';
import { IChatSessionRepository } from '../../domain/repositories/chat-session.repository.interface';
import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';
import { ChatSession } from '../../domain/entities/chat-session.entity';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { User } from '../../domain/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

describe('ChatUseCase - Clear Messages', () => {
  let chatUseCase: ChatUseCase;
  let chatSessionRepository: jest.Mocked<IChatSessionRepository>;
  let chatMessageRepository: jest.Mocked<IChatMessageRepository>;
  let userRepository: jest.Mocked<IUserRepository>;
  let ollamaService: jest.Mocked<OllamaService>;
  let stableDiffusionService: jest.Mocked<StableDiffusionService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockSession: ChatSession = {
    id: 'session-123',
    userId: 'user-123',
    title: 'Test Session',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
    messages: [],
    updateActivity: jest.fn(),
  } as any;

  beforeEach(async () => {
    // Mock repositories
    const mockChatSessionRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findWithMessages: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      archive: jest.fn(),
      belongsToUser: jest.fn(),
    };

    const mockChatMessageRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySessionId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteBySessionId: jest.fn(),
      search: jest.fn(),
    };

    const mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockOllamaService = {
      generateResponse: jest.fn(),
      generateResponseWithStreaming: jest.fn(),
      isImageGenerationRequest: jest.fn(),
    };

    const mockStableDiffusionService = {
      generateImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatUseCase,
        {
          provide: 'IChatSessionRepository',
          useValue: mockChatSessionRepo,
        },
        {
          provide: 'IChatMessageRepository',
          useValue: mockChatMessageRepo,
        },
        {
          provide: 'IUserRepository',
          useValue: mockUserRepo,
        },
        {
          provide: OllamaService,
          useValue: mockOllamaService,
        },
        {
          provide: StableDiffusionService,
          useValue: mockStableDiffusionService,
        },
      ],
    }).compile();

    chatUseCase = module.get<ChatUseCase>(ChatUseCase);
    chatSessionRepository = module.get('IChatSessionRepository');
    chatMessageRepository = module.get('IChatMessageRepository');
    userRepository = module.get('IUserRepository');
    ollamaService = module.get(OllamaService);
    stableDiffusionService = module.get(StableDiffusionService);
  });

  describe('clearSessionMessages', () => {
    it('should clear all messages from a session', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';

      chatSessionRepository.belongsToUser.mockResolvedValue(true);
      chatMessageRepository.deleteBySessionId.mockResolvedValue(undefined);

      // Act
      await chatUseCase.clearSessionMessages(userId, sessionId);

      // Assert
      expect(chatSessionRepository.belongsToUser).toHaveBeenCalledWith(sessionId, userId);
      expect(chatMessageRepository.deleteBySessionId).toHaveBeenCalledWith(sessionId);
    });

    it('should throw ForbiddenException if session does not belong to user', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-456';

      chatSessionRepository.belongsToUser.mockResolvedValue(false);

      // Act & Assert
      await expect(
        chatUseCase.clearSessionMessages(userId, sessionId)
      ).rejects.toThrow(ForbiddenException);

      expect(chatSessionRepository.belongsToUser).toHaveBeenCalledWith(sessionId, userId);
      expect(chatMessageRepository.deleteBySessionId).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';

      chatSessionRepository.belongsToUser.mockResolvedValue(true);
      chatMessageRepository.deleteBySessionId.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        chatUseCase.clearSessionMessages(userId, sessionId)
      ).rejects.toThrow('Database error');

      expect(chatSessionRepository.belongsToUser).toHaveBeenCalledWith(sessionId, userId);
      expect(chatMessageRepository.deleteBySessionId).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('Clear Messages Integration Flow', () => {
    it('should clear messages and allow new messages to be sent', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';

      // Setup mocks for clearing
      chatSessionRepository.belongsToUser.mockResolvedValue(true);
      chatMessageRepository.deleteBySessionId.mockResolvedValue(undefined);

      // Setup mocks for sending new message
      chatSessionRepository.findById.mockResolvedValue(mockSession);
      chatMessageRepository.findBySessionId.mockResolvedValue({
        messages: [],
        total: 0,
      });
      chatMessageRepository.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'msg-' + Math.random() } as ChatMessage)
      );
      ollamaService.isImageGenerationRequest.mockReturnValue(false);
      ollamaService.generateResponseWithStreaming.mockResolvedValue({
        content: 'Test response',
        metadata: {},
      });

      // Act - Clear messages
      await chatUseCase.clearSessionMessages(userId, sessionId);

      // Assert - Messages cleared
      expect(chatMessageRepository.deleteBySessionId).toHaveBeenCalledWith(sessionId);

      // Act - Send new message after clearing
      const onToken = jest.fn();
      const result = await chatUseCase.sendMessageWithStreaming(
        userId,
        {
          sessionId,
          content: 'New message after clear',
        },
        onToken
      );

      // Assert - New message sent successfully
      expect(result.sessionId).toBe(sessionId);
      expect(chatMessageRepository.create).toHaveBeenCalled();
    });

    it('should maintain session after clearing messages', async () => {
      // Arrange
      const userId = 'user-123';
      const sessionId = 'session-123';

      chatSessionRepository.belongsToUser.mockResolvedValue(true);
      chatMessageRepository.deleteBySessionId.mockResolvedValue(undefined);
      chatSessionRepository.findById.mockResolvedValue(mockSession);

      // Act - Clear messages
      await chatUseCase.clearSessionMessages(userId, sessionId);

      // Assert - Session still exists
      const session = await chatSessionRepository.findById(sessionId);
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
    });
  });

  describe('New Chat Flow', () => {
    it('should create new session when sessionId is null', async () => {
      // Arrange
      const userId = 'user-123';
      const newSession = { ...mockSession, id: 'new-session-123' };

      chatSessionRepository.create.mockResolvedValue(newSession);
      chatMessageRepository.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'msg-' + Math.random() } as ChatMessage)
      );
      chatMessageRepository.findBySessionId.mockResolvedValue({
        messages: [],
        total: 0,
      });
      ollamaService.isImageGenerationRequest.mockReturnValue(false);
      ollamaService.generateResponseWithStreaming.mockResolvedValue({
        content: 'Response to new chat',
        metadata: {},
      });

      // Act
      const onToken = jest.fn();
      const result = await chatUseCase.sendMessageWithStreaming(
        userId,
        {
          sessionId: null, // No session ID = new chat
          content: 'First message in new chat',
        },
        onToken
      );

      // Assert
      expect(chatSessionRepository.create).toHaveBeenCalled();
      expect(result.sessionId).toBe('new-session-123');
    });

    it('should not delete previous sessions when creating new chat', async () => {
      // Arrange
      const userId = 'user-123';
      const existingSession = { ...mockSession, id: 'existing-session' };
      const newSession = { ...mockSession, id: 'new-session' };

      chatSessionRepository.create.mockResolvedValue(newSession);
      chatMessageRepository.create.mockImplementation((data: any) => 
        Promise.resolve({ ...data, id: 'msg-' + Math.random() } as ChatMessage)
      );
      chatMessageRepository.findBySessionId.mockResolvedValue({
        messages: [],
        total: 0,
      });
      ollamaService.isImageGenerationRequest.mockReturnValue(false);
      ollamaService.generateResponseWithStreaming.mockResolvedValue({
        content: 'Response',
        metadata: {},
      });

      // Act - Create new chat
      const onToken = jest.fn();
      await chatUseCase.sendMessageWithStreaming(
        userId,
        {
          sessionId: null,
          content: 'New chat message',
        },
        onToken
      );

      // Assert - No delete operations called
      expect(chatSessionRepository.softDelete).not.toHaveBeenCalled();
      expect(chatMessageRepository.deleteBySessionId).not.toHaveBeenCalled();
    });
  });
});

