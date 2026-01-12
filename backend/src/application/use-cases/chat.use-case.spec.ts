import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatUseCase } from './chat.use-case';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';

describe('ChatUseCase', () => {
  let chatUseCase: ChatUseCase;
  let mockChatSessionRepository: any;
  let mockChatMessageRepository: any;
  let mockUserRepository: any;
  let mockOllamaService: any;
  let mockStableDiffusionService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    title: 'Test Session',
    status: 'active',
    messages: [],
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    updateActivity: jest.fn(),
    getMessageCount: jest.fn().mockReturnValue(0),
  };

  const mockMessage = {
    id: 'message-123',
    content: 'Hello',
    role: 'user',
    chatSessionId: 'session-123',
    status: 'sent',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockChatSessionRepository = {
      create: jest.fn().mockResolvedValue(mockSession),
      findById: jest.fn().mockResolvedValue(mockSession),
      findByIdAndUserId: jest.fn().mockResolvedValue(mockSession),
      findByUserId: jest.fn().mockResolvedValue({ sessions: [mockSession], total: 1 }),
      findWithMessages: jest.fn().mockResolvedValue(mockSession),
      update: jest.fn().mockResolvedValue(mockSession),
      softDelete: jest.fn().mockResolvedValue(undefined),
      archive: jest.fn().mockResolvedValue(undefined),
      belongsToUser: jest.fn().mockResolvedValue(true),
      updateLastActivity: jest.fn().mockResolvedValue(undefined),
    };

    mockChatMessageRepository = {
      create: jest.fn().mockResolvedValue(mockMessage),
      findById: jest.fn().mockResolvedValue(mockMessage),
      findBySessionId: jest.fn().mockResolvedValue({ messages: [], total: 0 }),
      findRecentByUserId: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(mockMessage),
    };

    mockUserRepository = {
      findById: jest.fn().mockResolvedValue(mockUser),
    };

    mockOllamaService = {
      generateResponse: jest.fn().mockResolvedValue({
        content: 'AI Response',
        model: 'llama3.2',
        tokens: 10,
        processingTime: 100,
      }),
      generateResponseWithStreaming: jest.fn().mockResolvedValue({
        content: 'Streamed Response',
        model: 'llama3.2',
        tokens: 15,
        processingTime: 150,
      }),
      isImageGenerationRequest: jest.fn().mockReturnValue(false),
      generateConversationTitle: jest.fn().mockResolvedValue('Generated Title'),
    };

    mockStableDiffusionService = {
      getConfigStatus: jest.fn().mockReturnValue({ enabled: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatUseCase,
        { provide: 'IChatSessionRepository', useValue: mockChatSessionRepository },
        { provide: 'IChatMessageRepository', useValue: mockChatMessageRepository },
        { provide: 'IUserRepository', useValue: mockUserRepository },
        { provide: OllamaService, useValue: mockOllamaService },
        { provide: StableDiffusionService, useValue: mockStableDiffusionService },
      ],
    }).compile();

    chatUseCase = module.get<ChatUseCase>(ChatUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new chat session', async () => {
      const result = await chatUseCase.createSession('user-123', {
        title: 'New Session',
      });

      expect(result.id).toBe('session-123');
      expect(result.title).toBe('Test Session');
      expect(mockChatSessionRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValueOnce(null);

      await expect(
        chatUseCase.createSession('invalid-user', { title: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions with pagination', async () => {
      const result = await chatUseCase.getUserSessions('user-123', 1, 20);

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockChatSessionRepository.findByUserId).toHaveBeenCalledWith('user-123', 1, 20);
    });
  });

  describe('getSessionWithMessages', () => {
    it('should return session with messages', async () => {
      const result = await chatUseCase.getSessionWithMessages('user-123', 'session-123');

      expect(result.id).toBe('session-123');
      expect(mockChatSessionRepository.findWithMessages).toHaveBeenCalledWith('session-123');
    });

    it('should throw NotFoundException when session not found', async () => {
      mockChatSessionRepository.findWithMessages.mockResolvedValueOnce(null);

      await expect(
        chatUseCase.getSessionWithMessages('user-123', 'invalid-session')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when session belongs to another user', async () => {
      mockChatSessionRepository.findWithMessages.mockResolvedValueOnce({
        ...mockSession,
        userId: 'other-user',
      });

      await expect(
        chatUseCase.getSessionWithMessages('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendMessage', () => {
    it('should create a new session if sessionId not provided', async () => {
      const result = await chatUseCase.sendMessage('user-123', {
        content: 'Hello',
      });

      expect(mockChatSessionRepository.create).toHaveBeenCalled();
      expect(result.userMessage).toBeDefined();
      expect(result.assistantMessage).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it('should use existing session if sessionId provided', async () => {
      const result = await chatUseCase.sendMessage('user-123', {
        content: 'Hello',
        sessionId: 'session-123',
      });

      expect(mockChatSessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(result.session.id).toBe('session-123');
    });

    it('should throw NotFoundException when session not found', async () => {
      mockChatSessionRepository.findById.mockResolvedValueOnce(null);

      await expect(
        chatUseCase.sendMessage('user-123', {
          content: 'Hello',
          sessionId: 'invalid-session',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when session belongs to another user', async () => {
      mockChatSessionRepository.findById.mockResolvedValueOnce({
        ...mockSession,
        userId: 'other-user',
      });

      await expect(
        chatUseCase.sendMessage('user-123', {
          content: 'Hello',
          sessionId: 'session-123',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should save user and assistant messages', async () => {
      await chatUseCase.sendMessage('user-123', { content: 'Hello' });

      // Should create 2 messages: user and assistant
      expect(mockChatMessageRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should use custom model if provided', async () => {
      await chatUseCase.sendMessage('user-123', {
        content: 'Hello',
        model: 'mistral',
      });

      expect(mockOllamaService.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ model: 'mistral' })
      );
    });
  });

  describe('sendMessageWithStreaming', () => {
    it('should stream response and save messages', async () => {
      const onToken = jest.fn();

      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello' },
        onToken
      );

      expect(mockOllamaService.generateResponseWithStreaming).toHaveBeenCalled();
      expect(mockChatMessageRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should throw ForbiddenException for unauthorized session', async () => {
      mockChatSessionRepository.findById.mockResolvedValueOnce({
        ...mockSession,
        userId: 'other-user',
      });

      await expect(
        chatUseCase.sendMessageWithStreaming(
          'user-123',
          { content: 'Hello', sessionId: 'session-123' },
          jest.fn()
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSessionMessages', () => {
    it('should return messages for a session', async () => {
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: [mockMessage],
        total: 1,
      });

      const result = await chatUseCase.getSessionMessages('user-123', 'session-123');

      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.getSessionMessages('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteSession', () => {
    it('should soft delete a session', async () => {
      await chatUseCase.deleteSession('user-123', 'session-123');

      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-123');
    });

    it('should throw ForbiddenException for unauthorized deletion', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.deleteSession('user-123', 'session-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archiveSession', () => {
    it('should archive a session', async () => {
      await chatUseCase.archiveSession('user-123', 'session-123');

      expect(mockChatSessionRepository.archive).toHaveBeenCalledWith('session-123');
    });
  });

  describe('getRecentMessages', () => {
    it('should return recent messages for user', async () => {
      mockChatMessageRepository.findRecentByUserId.mockResolvedValueOnce([mockMessage]);

      const result = await chatUseCase.getRecentMessages('user-123', 50);

      expect(result.messages).toHaveLength(1);
      expect(mockChatMessageRepository.findRecentByUserId).toHaveBeenCalledWith('user-123', 50);
    });
  });

  describe('Multiple Session Management', () => {
    it('should create multiple independent sessions for the same user', async () => {
      const session1 = await chatUseCase.createSession('user-123', {
        title: 'Session 1',
      });

      const session2 = await chatUseCase.createSession('user-123', {
        title: 'Session 2',
      });

      expect(mockChatSessionRepository.create).toHaveBeenCalledTimes(2);
      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
    });

    it('should send messages to different sessions independently', async () => {
      // Create first session and send message
      mockChatSessionRepository.create.mockResolvedValueOnce({
        ...mockSession,
        id: 'session-1',
      });

      const result1 = await chatUseCase.sendMessage('user-123', {
        content: 'Hello in session 1',
      });

      expect(result1.session.id).toBe('session-1');

      // Create second session and send message
      mockChatSessionRepository.create.mockResolvedValueOnce({
        ...mockSession,
        id: 'session-2',
      });

      const result2 = await chatUseCase.sendMessage('user-123', {
        content: 'Hello in session 2',
      });

      expect(result2.session.id).toBe('session-2');
      expect(mockChatSessionRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate message history for each session', async () => {
      const session1Messages = [
        { ...mockMessage, id: 'msg-1', chatSessionId: 'session-1' },
        { ...mockMessage, id: 'msg-2', chatSessionId: 'session-1' },
      ];

      const session2Messages = [
        { ...mockMessage, id: 'msg-3', chatSessionId: 'session-2' },
      ];

      // Get messages for session 1
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: session1Messages,
        total: 2,
      });

      const result1 = await chatUseCase.getSessionMessages('user-123', 'session-1');
      expect(result1.messages).toHaveLength(2);

      // Get messages for session 2
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: session2Messages,
        total: 1,
      });

      const result2 = await chatUseCase.getSessionMessages('user-123', 'session-2');
      expect(result2.messages).toHaveLength(1);
    });

    it('should not leak messages between sessions', async () => {
      // Send message to session-1
      mockChatSessionRepository.findById.mockResolvedValueOnce({
        ...mockSession,
        id: 'session-1',
      });

      await chatUseCase.sendMessage('user-123', {
        content: 'Message for session 1',
        sessionId: 'session-1',
      });

      // Verify message was created with correct sessionId
      expect(mockChatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chatSessionId: 'session-1',
        })
      );
    });
  });

  describe('Session Lifecycle', () => {
    it('should create session without sessionId in sendMessage', async () => {
      const result = await chatUseCase.sendMessage('user-123', {
        content: 'First message',
      });

      expect(mockChatSessionRepository.create).toHaveBeenCalled();
      expect(result.session).toBeDefined();
      expect(result.session.id).toBe('session-123');
    });

    it('should reuse existing session when sessionId provided', async () => {
      const result = await chatUseCase.sendMessage('user-123', {
        content: 'Follow-up message',
        sessionId: 'session-123',
      });

      expect(mockChatSessionRepository.create).not.toHaveBeenCalled();
      expect(mockChatSessionRepository.findById).toHaveBeenCalledWith('session-123');
      expect(result.session.id).toBe('session-123');
    });

    it('should update session activity when sending message', async () => {
      await chatUseCase.sendMessage('user-123', {
        content: 'Message',
        sessionId: 'session-123',
      });

      expect(mockSession.updateActivity).toHaveBeenCalled();
      expect(mockChatSessionRepository.update).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          lastActivityAt: expect.any(Date),
        })
      );
    });

    it('should generate title from first message when creating session', async () => {
      const longMessage = 'This is a very long message that should be truncated for the title';
      
      await chatUseCase.sendMessage('user-123', {
        content: longMessage,
      });

      expect(mockChatSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('This is a'),
        })
      );
    });
  });

  describe('Session Context and History', () => {
    it('should include message history in AI context', async () => {
      const historyMessages = [
        { ...mockMessage, id: 'msg-1', content: 'Previous user message', role: 'user' },
        { ...mockMessage, id: 'msg-2', content: 'Previous AI response', role: 'assistant' },
      ];

      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: historyMessages,
        total: 2,
      });

      await chatUseCase.sendMessage('user-123', {
        content: 'New message',
        sessionId: 'session-123',
      });

      // Verify that generateResponse was called with context including history
      expect(mockOllamaService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Previous user message'),
        expect.any(Object)
      );
    });

    it('should limit history context to last 10 messages', async () => {
      // Create 15 messages
      const manyMessages = Array.from({ length: 15 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        content: `Message ${i}`,
        createdAt: new Date(Date.now() + i * 1000),
      }));

      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: manyMessages,
        total: 15,
      });

      await chatUseCase.sendMessage('user-123', {
        content: 'New message',
        sessionId: 'session-123',
      });

      // Context should only include last 10 messages + current
      const contextCall = mockOllamaService.generateResponse.mock.calls[0][0];
      const messageCount = (contextCall.match(/Message \d+/g) || []).length;
      expect(messageCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Session Streaming', () => {
    it('should return sessionId when streaming without initial sessionId', async () => {
      const onToken = jest.fn();

      const result = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello' },
        onToken
      );

      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toBe('session-123');
    });

    it('should return same sessionId when streaming with existing session', async () => {
      const onToken = jest.fn();

      const result = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello', sessionId: 'session-123' },
        onToken
      );

      expect(result.sessionId).toBe('session-123');
      expect(mockChatSessionRepository.create).not.toHaveBeenCalled();
    });

    it('should handle image generation in streaming endpoint', async () => {
      mockOllamaService.isImageGenerationRequest.mockReturnValueOnce(true);
      mockOllamaService.generateResponse.mockResolvedValueOnce({
        content: 'Image generated',
        metadata: { imageGeneration: true },
      });

      const onToken = jest.fn();

      const result = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'generate an image of a cat' },
        onToken
      );

      expect(result.sessionId).toBeDefined();
      expect(result.isImageGeneration).toBe(true);
    });
  });
});

