import { Test, TestingModule } from '@nestjs/testing';
import { ChatUseCase } from './chat.use-case';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';

/**
 * Integration tests for ChatUseCase - Testing complete conversation flows
 */
describe('ChatUseCase - Integration Tests', () => {
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

  beforeEach(async () => {
    // Track created sessions and messages
    const sessions = new Map();
    const messages = new Map();
    let sessionCounter = 0;
    let messageCounter = 0;

    mockChatSessionRepository = {
      create: jest.fn().mockImplementation((data) => {
        const session = {
          id: `session-${++sessionCounter}`,
          userId: data.userId,
          title: data.title || 'Nova Conversa',
          status: data.status || 'active',
          messages: [],
          lastActivityAt: data.lastActivityAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          updateActivity: jest.fn(),
          getMessageCount: jest.fn(() => messages.get(session.id)?.length || 0),
        };
        sessions.set(session.id, session);
        messages.set(session.id, []);
        return Promise.resolve(session);
      }),
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve(sessions.get(id) || null);
      }),
      findByIdAndUserId: jest.fn().mockImplementation((id, userId) => {
        const session = sessions.get(id);
        return Promise.resolve(session?.userId === userId ? session : null);
      }),
      findByUserId: jest.fn().mockImplementation((userId) => {
        const userSessions = Array.from(sessions.values()).filter(
          (s) => s.userId === userId && s.status !== 'deleted'
        );
        return Promise.resolve({ sessions: userSessions, total: userSessions.length });
      }),
      findWithMessages: jest.fn().mockImplementation((id) => {
        const session = sessions.get(id);
        if (session) {
          session.messages = messages.get(id) || [];
        }
        return Promise.resolve(session || null);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const session = sessions.get(id);
        if (session) {
          Object.assign(session, data, { updatedAt: new Date() });
        }
        return Promise.resolve(session);
      }),
      softDelete: jest.fn().mockImplementation((id) => {
        const session = sessions.get(id);
        if (session) {
          session.status = 'deleted';
          session.deletedAt = new Date();
        }
        return Promise.resolve(undefined);
      }),
      archive: jest.fn().mockImplementation((id) => {
        const session = sessions.get(id);
        if (session) {
          session.status = 'archived';
        }
        return Promise.resolve(undefined);
      }),
      belongsToUser: jest.fn().mockImplementation((sessionId, userId) => {
        const session = sessions.get(sessionId);
        return Promise.resolve(session?.userId === userId);
      }),
      updateLastActivity: jest.fn().mockImplementation((id) => {
        const session = sessions.get(id);
        if (session) {
          session.lastActivityAt = new Date();
        }
        return Promise.resolve(undefined);
      }),
    };

    mockChatMessageRepository = {
      create: jest.fn().mockImplementation((data) => {
        const message = {
          id: `message-${++messageCounter}`,
          content: data.content,
          role: data.role,
          chatSessionId: data.chatSessionId,
          status: data.status || 'sent',
          metadata: data.metadata || {},
          attachments: data.attachments || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const sessionMessages = messages.get(data.chatSessionId) || [];
        sessionMessages.push(message);
        messages.set(data.chatSessionId, sessionMessages);
        return Promise.resolve(message);
      }),
      findById: jest.fn().mockImplementation((id) => {
        for (const msgList of messages.values()) {
          const msg = msgList.find((m) => m.id === id);
          if (msg) return Promise.resolve(msg);
        }
        return Promise.resolve(null);
      }),
      findBySessionId: jest.fn().mockImplementation((sessionId) => {
        const sessionMessages = messages.get(sessionId) || [];
        return Promise.resolve({ messages: sessionMessages, total: sessionMessages.length });
      }),
      findRecentByUserId: jest.fn().mockImplementation((userId, limit) => {
        const allMessages = [];
        for (const [sessionId, msgList] of messages.entries()) {
          const session = sessions.get(sessionId);
          if (session?.userId === userId) {
            allMessages.push(...msgList);
          }
        }
        return Promise.resolve(allMessages.slice(-limit));
      }),
      update: jest.fn().mockImplementation((id, data) => {
        for (const msgList of messages.values()) {
          const msg = msgList.find((m) => m.id === id);
          if (msg) {
            Object.assign(msg, data, { updatedAt: new Date() });
            return Promise.resolve(msg);
          }
        }
        return Promise.resolve(null);
      }),
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
      generateResponseWithStreaming: jest.fn().mockImplementation(async (context, options, onToken) => {
        const response = 'Streamed AI Response';
        // Simulate streaming
        for (let i = 0; i < response.length; i++) {
          onToken(response[i], response.substring(0, i + 1));
        }
        return {
          content: response,
          model: 'llama3.2',
          tokens: 15,
          processingTime: 150,
        };
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

  describe('Complete Conversation Flow', () => {
    it('should create new conversation when no sessionId provided', async () => {
      // First message - should create new session
      const result1 = await chatUseCase.sendMessage('user-123', {
        content: 'Hello, this is my first message',
      });

      expect(result1.session).toBeDefined();
      expect(result1.session.id).toBe('session-1');
      expect(result1.userMessage.content).toBe('Hello, this is my first message');
      expect(result1.assistantMessage.content).toBe('AI Response');

      // Verify session was created
      const sessions = await chatUseCase.getUserSessions('user-123');
      expect(sessions.sessions).toHaveLength(1);
      expect(sessions.sessions[0].id).toBe('session-1');
    });

    it('should continue conversation in same session when sessionId provided', async () => {
      // First message - creates session
      const result1 = await chatUseCase.sendMessage('user-123', {
        content: 'First message',
      });

      const sessionId = result1.session.id;

      // Second message - uses same session
      const result2 = await chatUseCase.sendMessage('user-123', {
        content: 'Second message',
        sessionId: sessionId,
      });

      expect(result2.session.id).toBe(sessionId);

      // Verify both messages are in the same session
      const sessionMessages = await chatUseCase.getSessionMessages('user-123', sessionId);
      expect(sessionMessages.messages).toHaveLength(4); // 2 user + 2 assistant
    });

    it('should create separate sessions for multiple conversations', async () => {
      // Conversation 1
      const conv1 = await chatUseCase.sendMessage('user-123', {
        content: 'First conversation',
      });

      // Conversation 2 (no sessionId = new session)
      const conv2 = await chatUseCase.sendMessage('user-123', {
        content: 'Second conversation',
      });

      expect(conv1.session.id).not.toBe(conv2.session.id);

      // Verify user has 2 sessions
      const sessions = await chatUseCase.getUserSessions('user-123');
      expect(sessions.sessions).toHaveLength(2);
    });

    it('should maintain separate message history for each conversation', async () => {
      // Create first conversation
      const conv1 = await chatUseCase.sendMessage('user-123', {
        content: 'Message in conversation 1',
      });
      const session1Id = conv1.session.id;

      await chatUseCase.sendMessage('user-123', {
        content: 'Another message in conversation 1',
        sessionId: session1Id,
      });

      // Create second conversation
      const conv2 = await chatUseCase.sendMessage('user-123', {
        content: 'Message in conversation 2',
      });
      const session2Id = conv2.session.id;

      // Verify separate histories
      const session1Messages = await chatUseCase.getSessionMessages('user-123', session1Id);
      const session2Messages = await chatUseCase.getSessionMessages('user-123', session2Id);

      expect(session1Messages.messages).toHaveLength(4); // 2 user + 2 assistant
      expect(session2Messages.messages).toHaveLength(2); // 1 user + 1 assistant

      // Verify messages don't leak between sessions
      const session1Content = session1Messages.messages.map((m) => m.content);
      expect(session1Content).toContain('Message in conversation 1');
      expect(session1Content).not.toContain('Message in conversation 2');
    });

    it('should handle streaming with automatic session creation', async () => {
      const tokens = [];
      const onToken = jest.fn((token, fullText) => {
        tokens.push(token);
      });

      // First streaming message - should create session
      const result = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Streaming message' },
        onToken
      );

      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toBe('session-1');
      expect(onToken).toHaveBeenCalled();

      // Verify session was created and messages saved
      const sessionMessages = await chatUseCase.getSessionMessages('user-123', result.sessionId);
      expect(sessionMessages.messages).toHaveLength(2); // user + assistant
    });

    it('should reuse session in streaming when sessionId provided', async () => {
      // Create initial session
      const firstResult = await chatUseCase.sendMessage('user-123', {
        content: 'First message',
      });
      const sessionId = firstResult.session.id;

      // Stream to same session
      const onToken = jest.fn();
      const streamResult = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Streaming to existing session', sessionId },
        onToken
      );

      expect(streamResult.sessionId).toBe(sessionId);

      // Verify messages are in same session
      const sessionMessages = await chatUseCase.getSessionMessages('user-123', sessionId);
      expect(sessionMessages.messages).toHaveLength(4); // 2 user + 2 assistant
    });

    it('should prevent session creation when explicitly provided', async () => {
      // Send message with explicit sessionId
      const result = await chatUseCase.sendMessage('user-123', {
        content: 'Message',
        sessionId: 'session-1',
      });

      // Should use provided session (mock will create it)
      expect(result.session.id).toBe('session-1');
      expect(mockChatSessionRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session Isolation', () => {
    it('should not allow access to other users sessions', async () => {
      // User 1 creates a session
      const user1Session = await chatUseCase.sendMessage('user-123', {
        content: 'User 1 message',
      });

      // Mock that session belongs to user-123
      mockChatSessionRepository.belongsToUser.mockImplementation(
        (sessionId, userId) => Promise.resolve(sessionId === user1Session.session.id && userId === 'user-123')
      );

      // User 2 tries to access user 1's session
      await expect(
        chatUseCase.getSessionMessages('user-456', user1Session.session.id)
      ).rejects.toThrow();
    });

    it('should delete only user own sessions', async () => {
      const session = await chatUseCase.sendMessage('user-123', {
        content: 'Message',
      });

      // Mock belongs check
      mockChatSessionRepository.belongsToUser.mockResolvedValue(false);

      await expect(
        chatUseCase.deleteSession('user-456', session.session.id)
      ).rejects.toThrow();
    });
  });

  describe('Session Context Management', () => {
    it('should include conversation history in AI context', async () => {
      // Create session with multiple messages
      const result1 = await chatUseCase.sendMessage('user-123', {
        content: 'What is TypeScript?',
      });

      const sessionId = result1.session.id;

      await chatUseCase.sendMessage('user-123', {
        content: 'Can you give me an example?',
        sessionId,
      });

      // Verify AI was called with context including previous messages
      const lastCall = mockOllamaService.generateResponse.mock.calls[1][0];
      expect(lastCall).toContain('What is TypeScript?');
      expect(lastCall).toContain('Can you give me an example?');
    });

    it('should start fresh context for new session', async () => {
      // First conversation
      await chatUseCase.sendMessage('user-123', {
        content: 'Message in first conversation',
      });

      // Second conversation (new session)
      await chatUseCase.sendMessage('user-123', {
        content: 'Message in second conversation',
      });

      // Verify second call doesn't include first conversation
      const secondCall = mockOllamaService.generateResponse.mock.calls[1][0];
      expect(secondCall).not.toContain('Message in first conversation');
      expect(secondCall).toContain('Message in second conversation');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle user starting multiple conversations in parallel', async () => {
      // User starts 3 different conversations
      const conv1 = chatUseCase.sendMessage('user-123', { content: 'Conversation 1' });
      const conv2 = chatUseCase.sendMessage('user-123', { content: 'Conversation 2' });
      const conv3 = chatUseCase.sendMessage('user-123', { content: 'Conversation 3' });

      const results = await Promise.all([conv1, conv2, conv3]);

      // All should have different session IDs
      const sessionIds = results.map((r) => r.session.id);
      expect(new Set(sessionIds).size).toBe(3);

      // User should have 3 sessions
      const sessions = await chatUseCase.getUserSessions('user-123');
      expect(sessions.sessions).toHaveLength(3);
    });

    it('should handle switching between conversations', async () => {
      // Create two conversations
      const conv1 = await chatUseCase.sendMessage('user-123', { content: 'Conv 1 - Msg 1' });
      const conv2 = await chatUseCase.sendMessage('user-123', { content: 'Conv 2 - Msg 1' });

      const session1Id = conv1.session.id;
      const session2Id = conv2.session.id;

      // Continue first conversation
      await chatUseCase.sendMessage('user-123', {
        content: 'Conv 1 - Msg 2',
        sessionId: session1Id,
      });

      // Continue second conversation
      await chatUseCase.sendMessage('user-123', {
        content: 'Conv 2 - Msg 2',
        sessionId: session2Id,
      });

      // Continue first again
      await chatUseCase.sendMessage('user-123', {
        content: 'Conv 1 - Msg 3',
        sessionId: session1Id,
      });

      // Verify correct message counts
      const session1Messages = await chatUseCase.getSessionMessages('user-123', session1Id);
      const session2Messages = await chatUseCase.getSessionMessages('user-123', session2Id);

      expect(session1Messages.messages).toHaveLength(6); // 3 user + 3 assistant
      expect(session2Messages.messages).toHaveLength(4); // 2 user + 2 assistant
    });
  });
});

