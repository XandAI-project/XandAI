import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatUseCase } from '../../application/use-cases/chat.use-case';
import { Response } from 'express';

describe('ChatController', () => {
  let controller: ChatController;
  let mockChatUseCase: any;

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  const mockSession = {
    id: 'session-123',
    title: 'Test Session',
    status: 'active',
    messageCount: 0,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'message-123',
    content: 'Hello',
    role: 'user',
    status: 'sent',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    mockChatUseCase = {
      createSession: jest.fn().mockResolvedValue(mockSession),
      getUserSessions: jest.fn().mockResolvedValue({ sessions: [mockSession], total: 1 }),
      getSessionWithMessages: jest.fn().mockResolvedValue({ ...mockSession, messages: [] }),
      updateSession: jest.fn().mockResolvedValue(mockSession),
      archiveSession: jest.fn().mockResolvedValue(undefined),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue({
        userMessage: { ...mockMessage, role: 'user' },
        assistantMessage: { ...mockMessage, id: 'msg-456', role: 'assistant', content: 'AI Response' },
        session: mockSession,
      }),
      sendMessageWithStreaming: jest.fn().mockImplementation(async (userId, dto, onToken) => {
        onToken('Hello', 'Hello');
        onToken(' World', 'Hello World');
      }),
      getSessionMessages: jest.fn().mockResolvedValue({ messages: [mockMessage], total: 1 }),
      getRecentMessages: jest.fn().mockResolvedValue({ messages: [mockMessage] }),
      addMessageToSession: jest.fn().mockResolvedValue(mockMessage),
      createOrUpdateMessage: jest.fn().mockResolvedValue(mockMessage),
      attachImageToMessage: jest.fn().mockResolvedValue(mockMessage),
      searchMessages: jest.fn().mockResolvedValue([mockMessage]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatUseCase, useValue: mockChatUseCase }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const result = await controller.createSession(mockRequest, { title: 'New Session' });

      expect(result.id).toBe('session-123');
      expect(mockChatUseCase.createSession).toHaveBeenCalledWith('user-123', { title: 'New Session' });
    });
  });

  describe('getUserSessions', () => {
    it('should return paginated sessions', async () => {
      const result = await controller.getUserSessions(mockRequest, 1, 20);

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockChatUseCase.getUserSessions).toHaveBeenCalledWith('user-123', 1, 20);
    });
  });

  describe('getSessionWithMessages', () => {
    it('should return session with messages', async () => {
      const result = await controller.getSessionWithMessages(mockRequest, 'session-123');

      expect(result.id).toBe('session-123');
      expect(mockChatUseCase.getSessionWithMessages).toHaveBeenCalledWith('user-123', 'session-123');
    });
  });

  describe('updateSession', () => {
    it('should update session', async () => {
      const result = await controller.updateSession(mockRequest, 'session-123', { title: 'Updated' });

      expect(result.id).toBe('session-123');
      expect(mockChatUseCase.updateSession).toHaveBeenCalledWith('user-123', 'session-123', { title: 'Updated' });
    });
  });

  describe('archiveSession', () => {
    it('should archive session', async () => {
      await controller.archiveSession(mockRequest, 'session-123');

      expect(mockChatUseCase.archiveSession).toHaveBeenCalledWith('user-123', 'session-123');
    });
  });

  describe('deleteSession', () => {
    it('should delete session', async () => {
      await controller.deleteSession(mockRequest, 'session-123');

      expect(mockChatUseCase.deleteSession).toHaveBeenCalledWith('user-123', 'session-123');
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      const result = await controller.sendMessage(mockRequest, {
        content: 'Hello',
        sessionId: 'session-123',
      });

      expect(result.userMessage.content).toBe('Hello');
      expect(result.assistantMessage.content).toBe('AI Response');
      expect(mockChatUseCase.sendMessage).toHaveBeenCalledWith('user-123', {
        content: 'Hello',
        sessionId: 'session-123',
      });
    });
  });

  describe('sendMessageStream', () => {
    it('should stream response via SSE', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.sendMessageStream(
        mockRequest,
        { content: 'Hello' },
        mockResponse
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      mockChatUseCase.sendMessageWithStreaming.mockRejectedValueOnce(new Error('Stream error'));

      const mockResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await controller.sendMessageStream(
        mockRequest,
        { content: 'Hello' },
        mockResponse
      );

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('sendMessageToSession', () => {
    it('should send message to specific session', async () => {
      const result = await controller.sendMessageToSession(
        mockRequest,
        'session-123',
        { content: 'Hello', model: 'llama3.2' }
      );

      expect(result.userMessage).toBeDefined();
      expect(result.assistantMessage).toBeDefined();
    });
  });

  describe('addMessageToSession', () => {
    it('should add message to session', async () => {
      const result = await controller.addMessageToSession(
        mockRequest,
        'session-123',
        { content: 'Test', role: 'user' }
      );

      expect(result.id).toBe('message-123');
      expect(mockChatUseCase.addMessageToSession).toHaveBeenCalledWith(
        'user-123',
        'session-123',
        'Test',
        'user'
      );
    });
  });

  describe('getSessionMessages', () => {
    it('should return session messages', async () => {
      const result = await controller.getSessionMessages(
        mockRequest,
        'session-123',
        1,
        50
      );

      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getRecentMessages', () => {
    it('should return recent messages', async () => {
      const result = await controller.getRecentMessages(mockRequest, 50);

      expect(result.messages).toHaveLength(1);
      expect(mockChatUseCase.getRecentMessages).toHaveBeenCalledWith('user-123', 50);
    });
  });

  describe('createOrUpdateMessage', () => {
    it('should create or update message', async () => {
      const result = await controller.createOrUpdateMessage(
        mockRequest,
        'message-123',
        { id: 'message-123', content: 'Updated', role: 'user' }
      );

      expect(result.id).toBe('message-123');
    });
  });

  describe('attachImageToMessage', () => {
    it('should attach image to message', async () => {
      const result = await controller.attachImageToMessage(
        mockRequest,
        'message-123',
        { imageUrl: 'http://example.com/image.png', filename: 'image.png' }
      );

      expect(result.id).toBe('message-123');
      expect(mockChatUseCase.attachImageToMessage).toHaveBeenCalledWith(
        'user-123',
        'message-123',
        'http://example.com/image.png',
        'image.png',
        undefined,
        undefined
      );
    });
  });
});

