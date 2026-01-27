import { Test, TestingModule } from '@nestjs/testing';
import { ChatUseCase } from './chat.use-case';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { ChatSession } from '../../domain/entities/chat-session.entity';

/**
 * Testes para garantir que não há duplicação de mensagens no contexto
 * 
 * PROBLEMA CORRIGIDO:
 * - O backend estava salvando a mensagem do usuário ANTES de buscar o histórico
 * - Isso causava duplicação: a mensagem aparecia no histórico E era adicionada novamente no contexto
 * - Resultado: O Ollama recebia a primeira mensagem repetida em loop
 * 
 * SOLUÇÃO:
 * - Buscar histórico ANTES de salvar a nova mensagem
 * - Construir contexto com histórico + nova mensagem
 * - Salvar mensagem DEPOIS de buscar histórico
 */
describe('ChatUseCase - Context Duplication Fix', () => {
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

  const mockSession: Partial<ChatSession> = {
    id: 'session-123',
    userId: 'user-123',
    title: 'Test Session',
    status: 'active',
    updateActivity: jest.fn(),
    getMessageCount: jest.fn().mockReturnValue(0),
  };

  beforeEach(async () => {
    // Track the order of operations
    const operationLog: string[] = [];

    mockChatSessionRepository = {
      create: jest.fn().mockImplementation((data) => {
        operationLog.push('SESSION_CREATE');
        return Promise.resolve({ ...mockSession, ...data });
      }),
      findById: jest.fn().mockImplementation(() => {
        operationLog.push('SESSION_FIND');
        return Promise.resolve(mockSession);
      }),
      update: jest.fn().mockImplementation(() => {
        operationLog.push('SESSION_UPDATE');
        return Promise.resolve(mockSession);
      }),
      belongsToUser: jest.fn().mockResolvedValue(true),
      findByUserId: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
    };

    mockChatMessageRepository = {
      create: jest.fn().mockImplementation((data) => {
        operationLog.push(`MESSAGE_CREATE_${data.role.toUpperCase()}`);
        return Promise.resolve({
          id: `msg-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findBySessionId: jest.fn().mockImplementation(() => {
        operationLog.push('HISTORY_FETCH');
        // Return existing conversation history
        return Promise.resolve({
          messages: [
            {
              id: 'msg-1',
              content: 'First user message',
              role: 'user',
              chatSessionId: 'session-123',
              createdAt: new Date('2024-01-01T10:00:00Z'),
            },
            {
              id: 'msg-2',
              content: 'First assistant response',
              role: 'assistant',
              chatSessionId: 'session-123',
              createdAt: new Date('2024-01-01T10:00:01Z'),
            },
          ],
          total: 2,
        });
      }),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn().mockResolvedValue(mockUser),
    };

    mockOllamaService = {
      generateResponse: jest.fn().mockImplementation((prompt) => {
        operationLog.push('OLLAMA_GENERATE');
        // Capture the prompt to verify it doesn't have duplicates
        (mockOllamaService as any).lastPrompt = prompt;
        return Promise.resolve({
          content: 'AI Response',
          model: 'llama3.2',
          tokens: 10,
          processingTime: 100,
        });
      }),
      generateResponseWithStreaming: jest.fn().mockImplementation((prompt, options, onToken) => {
        operationLog.push('OLLAMA_STREAM');
        // Capture the prompt to verify it doesn't have duplicates
        (mockOllamaService as any).lastPrompt = prompt;
        
        // Simulate streaming
        onToken('AI ', 'AI ');
        onToken('Response', 'AI Response');
        
        return Promise.resolve({
          content: 'AI Response',
          model: 'llama3.2',
          tokens: 10,
          processingTime: 100,
        });
      }),
      isImageGenerationRequest: jest.fn().mockReturnValue(false),
      generateConversationTitle: jest.fn().mockResolvedValue('Test Title'),
    };

    mockStableDiffusionService = {
      generateImage: jest.fn(),
      testConnection: jest.fn(),
    };

    // Store operation log on the service for assertions
    (mockOllamaService as any).operationLog = operationLog;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatUseCase,
        {
          provide: 'IChatSessionRepository',
          useValue: mockChatSessionRepository,
        },
        {
          provide: 'IChatMessageRepository',
          useValue: mockChatMessageRepository,
        },
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
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
  });

  describe('sendMessageWithStreaming - Order of Operations', () => {
    it('should fetch history BEFORE creating user message', async () => {
      const onToken = jest.fn();
      const operationLog = (mockOllamaService as any).operationLog;

      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { 
          content: 'Second user message',
          sessionId: 'session-123' 
        },
        onToken
      );

      // Verify order: HISTORY_FETCH must come BEFORE MESSAGE_CREATE_USER
      const historyIndex = operationLog.indexOf('HISTORY_FETCH');
      const userMessageIndex = operationLog.indexOf('MESSAGE_CREATE_USER');

      expect(historyIndex).toBeGreaterThanOrEqual(0);
      expect(userMessageIndex).toBeGreaterThan(historyIndex);
      
      console.log('✅ Operation order:', operationLog);
    });

    it('should not include current message in history context', async () => {
      const onToken = jest.fn();

      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { 
          content: 'Second user message',
          sessionId: 'session-123' 
        },
        onToken
      );

      const prompt = (mockOllamaService as any).lastPrompt;
      
      // The prompt should include the history
      expect(prompt).toContain('First user message');
      expect(prompt).toContain('First assistant response');
      
      // The prompt should include the current message at the end
      expect(prompt).toContain('Second user message');
      
      // Count occurrences of "Second user message" - should appear only ONCE
      const occurrences = (prompt.match(/Second user message/g) || []).length;
      expect(occurrences).toBe(1);
      
      console.log('✅ Prompt context (no duplicates):', prompt);
    });

    it('should handle new session without duplicating first message', async () => {
      const onToken = jest.fn();
      
      // Mock empty history for new session
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: [],
        total: 0,
      });

      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { 
          content: 'First message in new session',
          sessionId: null // New session
        },
        onToken
      );

      const prompt = (mockOllamaService as any).lastPrompt;
      
      // Should only appear once (no history to duplicate from)
      const occurrences = (prompt.match(/First message in new session/g) || []).length;
      expect(occurrences).toBe(1);
      
      console.log('✅ New session prompt (no duplicates):', prompt);
    });
  });

  describe('sendMessage - Order of Operations', () => {
    it('should fetch history BEFORE creating user message', async () => {
      const operationLog = (mockOllamaService as any).operationLog;

      await chatUseCase.sendMessage('user-123', {
        content: 'Second user message',
        sessionId: 'session-123',
      });

      // Verify order: HISTORY_FETCH must come BEFORE MESSAGE_CREATE_USER
      const historyIndex = operationLog.indexOf('HISTORY_FETCH');
      const userMessageIndex = operationLog.indexOf('MESSAGE_CREATE_USER');

      expect(historyIndex).toBeGreaterThanOrEqual(0);
      expect(userMessageIndex).toBeGreaterThan(historyIndex);
      
      console.log('✅ Operation order (non-streaming):', operationLog);
    });

    it('should not include current message in history context', async () => {
      await chatUseCase.sendMessage('user-123', {
        content: 'Second user message',
        sessionId: 'session-123',
      });

      const prompt = (mockOllamaService as any).lastPrompt;
      
      // The prompt should include the history
      expect(prompt).toContain('First user message');
      expect(prompt).toContain('First assistant response');
      
      // The prompt should include the current message at the end
      expect(prompt).toContain('Second user message');
      
      // Count occurrences of "Second user message" - should appear only ONCE
      const occurrences = (prompt.match(/Second user message/g) || []).length;
      expect(occurrences).toBe(1);
      
      console.log('✅ Non-streaming prompt (no duplicates):', prompt);
    });
  });

  describe('Context Building with Multiple Messages', () => {
    it('should build correct context for long conversation', async () => {
      // Mock a longer conversation history
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: [
          {
            id: 'msg-1',
            content: 'What is AI?',
            role: 'user',
            chatSessionId: 'session-123',
            createdAt: new Date('2024-01-01T10:00:00Z'),
          },
          {
            id: 'msg-2',
            content: 'AI stands for Artificial Intelligence...',
            role: 'assistant',
            chatSessionId: 'session-123',
            createdAt: new Date('2024-01-01T10:00:01Z'),
          },
          {
            id: 'msg-3',
            content: 'Can you explain machine learning?',
            role: 'user',
            chatSessionId: 'session-123',
            createdAt: new Date('2024-01-01T10:01:00Z'),
          },
          {
            id: 'msg-4',
            content: 'Machine learning is a subset of AI...',
            role: 'assistant',
            chatSessionId: 'session-123',
            createdAt: new Date('2024-01-01T10:01:01Z'),
          },
        ],
        total: 4,
      });

      const onToken = jest.fn();
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { 
          content: 'What about deep learning?',
          sessionId: 'session-123' 
        },
        onToken
      );

      const prompt = (mockOllamaService as any).lastPrompt;
      
      // Should include all previous messages
      expect(prompt).toContain('What is AI?');
      expect(prompt).toContain('AI stands for Artificial Intelligence');
      expect(prompt).toContain('Can you explain machine learning?');
      expect(prompt).toContain('Machine learning is a subset of AI');
      
      // Should include current message only once
      expect(prompt).toContain('What about deep learning?');
      const occurrences = (prompt.match(/What about deep learning\?/g) || []).length;
      expect(occurrences).toBe(1);
      
      console.log('✅ Long conversation context built correctly');
    });
  });

  describe('Regression Test - First Message Loop Bug', () => {
    it('should NOT repeat first message in subsequent responses', async () => {
      // Simulate the bug scenario: user sends first message, then second message
      
      // First message (new session)
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: [],
        total: 0,
      });

      const onToken1 = jest.fn();
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { 
          content: 'Hello, who are you?',
          sessionId: null
        },
        onToken1
      );

      // Now simulate second message - history should have first exchange
      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: [
          {
            id: 'msg-1',
            content: 'Hello, who are you?',
            role: 'user',
            chatSessionId: 'session-123',
            createdAt: new Date('2024-01-01T10:00:00Z'),
          },
          {
            id: 'msg-2',
            content: 'I am XandAI, your AI assistant.',
            role: 'assistant',
            chatSessionId: 'session-123',
            createdAt: new Date('2024-01-01T10:00:01Z'),
          },
        ],
        total: 2,
      });

      const onToken2 = jest.fn();
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { 
          content: 'What can you do?',
          sessionId: 'session-123'
        },
        onToken2
      );

      const secondPrompt = (mockOllamaService as any).lastPrompt;
      
      // The second prompt should include first exchange
      expect(secondPrompt).toContain('Hello, who are you?');
      expect(secondPrompt).toContain('I am XandAI');
      
      // The second prompt should include new question
      expect(secondPrompt).toContain('What can you do?');
      
      // "Hello, who are you?" should appear only ONCE (from history, not duplicated)
      const firstMessageCount = (secondPrompt.match(/Hello, who are you\?/g) || []).length;
      expect(firstMessageCount).toBe(1);
      
      // "What can you do?" should appear only ONCE
      const secondMessageCount = (secondPrompt.match(/What can you do\?/g) || []).length;
      expect(secondMessageCount).toBe(1);
      
      console.log('✅ No message repetition in conversation flow');
      console.log('Second prompt:', secondPrompt);
    });
  });
});
