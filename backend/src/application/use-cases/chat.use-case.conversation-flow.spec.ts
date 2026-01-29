import { Test, TestingModule } from '@nestjs/testing';
import { ChatUseCase } from './chat.use-case';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { ChatSession } from '../../domain/entities/chat-session.entity';

/**
 * Teste de Integração - Fluxo Completo de Conversa
 * 
 * Este teste simula uma conversa real do início ao fim,
 * verificando que não há duplicação de mensagens em nenhum ponto.
 */
describe('ChatUseCase - Complete Conversation Flow Integration', () => {
  let chatUseCase: ChatUseCase;
  let mockChatSessionRepository: any;
  let mockChatMessageRepository: any;
  let mockUserRepository: any;
  let mockOllamaService: any;
  let mockStableDiffusionService: any;

  // Simula um banco de dados em memória
  const sessions = new Map<string, any>();
  const messages = new Map<string, any[]>();
  let sessionCounter = 0;
  let messageCounter = 0;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    // Reset in-memory database
    sessions.clear();
    messages.clear();
    sessionCounter = 0;
    messageCounter = 0;

    // Track all prompts sent to Ollama for verification
    const ollamaPrompts: string[] = [];

    mockChatSessionRepository = {
      create: jest.fn().mockImplementation((data) => {
        const sessionId = `session-${++sessionCounter}`;
        const session = {
          id: sessionId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          updateActivity: jest.fn(),
          getMessageCount: jest.fn().mockImplementation(() => {
            return messages.get(sessionId)?.length || 0;
          }),
        };
        sessions.set(sessionId, session);
        messages.set(sessionId, []);
        return Promise.resolve(session);
      }),
      findById: jest.fn().mockImplementation((id) => {
        const session = sessions.get(id);
        return Promise.resolve(session || null);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const session = sessions.get(id);
        if (session) {
          Object.assign(session, data);
        }
        return Promise.resolve(session);
      }),
      belongsToUser: jest.fn().mockResolvedValue(true),
      findByUserId: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
    };

    mockChatMessageRepository = {
      create: jest.fn().mockImplementation((data) => {
        const messageId = `msg-${++messageCounter}`;
        const message = {
          id: messageId,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const sessionMessages = messages.get(data.chatSessionId) || [];
        sessionMessages.push(message);
        messages.set(data.chatSessionId, sessionMessages);
        
        return Promise.resolve(message);
      }),
      findBySessionId: jest.fn().mockImplementation((sessionId) => {
        const sessionMessages = messages.get(sessionId) || [];
        return Promise.resolve({
          messages: [...sessionMessages], // Return copy to prevent mutations
          total: sessionMessages.length,
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
        ollamaPrompts.push(prompt);
        return Promise.resolve({
          content: `Response to: ${prompt.split('User: ').pop()?.substring(0, 30)}...`,
          model: 'llama3.2',
          tokens: 10,
          processingTime: 100,
        });
      }),
      generateResponseWithStreaming: jest.fn().mockImplementation((prompt, options, onToken) => {
        ollamaPrompts.push(prompt);
        const response = `Response to: ${prompt.split('User: ').pop()?.substring(0, 30)}...`;
        
        // Simulate streaming
        onToken('Response ', 'Response ');
        onToken('to: ', 'Response to: ');
        onToken(response.substring(13), response);
        
        return Promise.resolve({
          content: response,
          model: 'llama3.2',
          tokens: 10,
          processingTime: 100,
        });
      }),
      isImageGenerationRequest: jest.fn().mockReturnValue(false),
      generateConversationTitle: jest.fn().mockResolvedValue('Test Conversation'),
    };

    mockStableDiffusionService = {
      generateImage: jest.fn(),
      testConnection: jest.fn(),
    };

    // Store prompts for assertions
    (mockOllamaService as any).allPrompts = ollamaPrompts;

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

  describe('Complete Conversation Flow - Streaming', () => {
    it('should handle a complete 5-message conversation without duplicates', async () => {
      const onToken = jest.fn();
      const allPrompts = (mockOllamaService as any).allPrompts;

      // Message 1: Start new conversation
      console.log('\n🔵 Sending message 1: "Hello, who are you?"');
      const result1 = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello, who are you?', sessionId: null },
        onToken
      );
      const sessionId = result1.sessionId;
      console.log(`✅ Session created: ${sessionId}`);
      console.log(`📊 Messages in DB: ${messages.get(sessionId)?.length}`);

      // Verify first prompt has no duplicates
      const prompt1 = allPrompts[0];
      expect(prompt1).toContain('Hello, who are you?');
      const count1 = (prompt1.match(/Hello, who are you\?/g) || []).length;
      expect(count1).toBe(1);
      console.log(`✅ Message 1 appears ${count1} time(s) in prompt`);

      // Message 2: Continue conversation
      console.log('\n🔵 Sending message 2: "What can you do?"');
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'What can you do?', sessionId },
        onToken
      );
      console.log(`📊 Messages in DB: ${messages.get(sessionId)?.length}`);
      
      // Debug: Show what's in the database
      const dbMessages = messages.get(sessionId);
      console.log('📝 Messages in DB:', dbMessages?.map(m => `${m.role}: ${m.content.substring(0, 30)}`));

      // Verify second prompt includes history but no duplicates
      const prompt2 = allPrompts[1];
      console.log('📝 Prompt 2:', prompt2);
      expect(prompt2).toContain('Hello, who are you?');
      expect(prompt2).toContain('What can you do?');
      // Count only USER messages, not in assistant responses
      const count2a = (prompt2.match(/User: Hello, who are you\?/g) || []).length;
      const count2b = (prompt2.match(/User: What can you do\?/g) || []).length;
      // Each user message should appear exactly once
      expect(count2a).toBe(1);
      expect(count2b).toBe(1);
      console.log(`✅ Message 1 appears ${count2a} time(s), Message 2 appears ${count2b} time(s)`);

      // Message 3: Continue conversation
      console.log('\n🔵 Sending message 3: "Tell me about AI"');
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Tell me about AI', sessionId },
        onToken
      );
      console.log(`📊 Messages in DB: ${messages.get(sessionId)?.length}`);

      const prompt3 = allPrompts[2];
      expect(prompt3).toContain('Hello, who are you?');
      expect(prompt3).toContain('What can you do?');
      expect(prompt3).toContain('Tell me about AI');
      const count3a = (prompt3.match(/User: Hello, who are you\?/g) || []).length;
      const count3b = (prompt3.match(/User: What can you do\?/g) || []).length;
      const count3c = (prompt3.match(/User: Tell me about AI/g) || []).length;
      expect(count3a).toBe(1);
      expect(count3b).toBe(1);
      expect(count3c).toBe(1);
      console.log(`✅ All messages appear exactly once`);

      // Message 4: Continue conversation
      console.log('\n🔵 Sending message 4: "Explain machine learning"');
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Explain machine learning', sessionId },
        onToken
      );
      console.log(`📊 Messages in DB: ${messages.get(sessionId)?.length}`);

      const prompt4 = allPrompts[3];
      const count4a = (prompt4.match(/User: Hello, who are you\?/g) || []).length;
      const count4b = (prompt4.match(/User: What can you do\?/g) || []).length;
      const count4c = (prompt4.match(/User: Tell me about AI/g) || []).length;
      const count4d = (prompt4.match(/User: Explain machine learning/g) || []).length;
      expect(count4a).toBe(1);
      expect(count4b).toBe(1);
      expect(count4c).toBe(1);
      expect(count4d).toBe(1);
      console.log(`✅ All 4 messages appear exactly once`);

      // Message 5: Final message
      console.log('\n🔵 Sending message 5: "Thanks for the help!"');
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Thanks for the help!', sessionId },
        onToken
      );
      console.log(`📊 Messages in DB: ${messages.get(sessionId)?.length}`);

      const prompt5 = allPrompts[4];
      const count5a = (prompt5.match(/User: Hello, who are you\?/g) || []).length;
      const count5e = (prompt5.match(/User: Thanks for the help!/g) || []).length;
      expect(count5a).toBe(1);
      expect(count5e).toBe(1);
      console.log(`✅ All 5 messages appear exactly once`);

      // Verify total messages in database
      const finalMessages = messages.get(sessionId);
      expect(finalMessages?.length).toBe(10); // 5 user + 5 assistant
      console.log(`\n✅ Final message count: ${finalMessages?.length} (5 user + 5 assistant)`);
      
      console.log('\n🎉 Complete conversation flow test PASSED - No duplicates detected!');
    });

    it('should handle rapid-fire messages without context corruption', async () => {
      const onToken = jest.fn();
      const allPrompts = (mockOllamaService as any).allPrompts;

      // Create session with first message
      const result = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Message 1', sessionId: null },
        onToken
      );
      const sessionId = result.sessionId;

      // Send 3 more messages rapidly
      await Promise.all([
        chatUseCase.sendMessageWithStreaming('user-123', { content: 'Message 2', sessionId }, onToken),
        chatUseCase.sendMessageWithStreaming('user-123', { content: 'Message 3', sessionId }, onToken),
        chatUseCase.sendMessageWithStreaming('user-123', { content: 'Message 4', sessionId }, onToken),
      ]);

      // Verify each message appears only once in its respective prompt
      for (let i = 0; i < allPrompts.length; i++) {
        const prompt = allPrompts[i];
        const messageNum = i + 1;
        const searchStr = `Message ${messageNum}`;
        const count = (prompt.match(new RegExp(searchStr, 'g')) || []).length;
        expect(count).toBe(1);
        console.log(`✅ "${searchStr}" appears ${count} time(s) in prompt ${i + 1}`);
      }

      console.log('🎉 Rapid-fire messages test PASSED');
    });
  });

  describe('Complete Conversation Flow - Non-Streaming', () => {
    it('should handle conversation without streaming', async () => {
      const allPrompts = (mockOllamaService as any).allPrompts;

      // Message 1
      const result1 = await chatUseCase.sendMessage('user-123', {
        content: 'First message',
        sessionId: null,
      });
      const sessionId = result1.session.id;

      // Message 2
      await chatUseCase.sendMessage('user-123', {
        content: 'Second message',
        sessionId,
      });

      // Message 3
      await chatUseCase.sendMessage('user-123', {
        content: 'Third message',
        sessionId,
      });

      // Verify no duplicates in any prompt
      const prompt1 = allPrompts[0];
      const prompt2 = allPrompts[1];
      const prompt3 = allPrompts[2];

      expect((prompt1.match(/User: First message/g) || []).length).toBe(1);
      expect((prompt2.match(/User: First message/g) || []).length).toBe(1);
      expect((prompt2.match(/User: Second message/g) || []).length).toBe(1);
      expect((prompt3.match(/User: First message/g) || []).length).toBe(1);
      expect((prompt3.match(/User: Second message/g) || []).length).toBe(1);
      expect((prompt3.match(/User: Third message/g) || []).length).toBe(1);

      console.log('🎉 Non-streaming conversation test PASSED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle identical consecutive messages', async () => {
      const onToken = jest.fn();
      const allPrompts = (mockOllamaService as any).allPrompts;

      const result = await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello', sessionId: null },
        onToken
      );
      const sessionId = result.sessionId;

      // Send same message again
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello', sessionId },
        onToken
      );

      // Send same message third time
      await chatUseCase.sendMessageWithStreaming(
        'user-123',
        { content: 'Hello', sessionId },
        onToken
      );

      // In prompt 2, "Hello" should appear 2 times (once from history, once current)
      const prompt2 = allPrompts[1];
      const count2 = (prompt2.match(/Hello/g) || []).length;
      expect(count2).toBe(2); // First "Hello" from history + current "Hello"

      // In prompt 3, "Hello" should appear 3 times (two from history, one current)
      const prompt3 = allPrompts[2];
      const count3 = (prompt3.match(/Hello/g) || []).length;
      expect(count3).toBe(3); // Two "Hello"s from history + current "Hello"

      console.log('✅ Identical messages handled correctly');
      console.log(`   Prompt 2: ${count2} occurrences (expected 2)`);
      console.log(`   Prompt 3: ${count3} occurrences (expected 3)`);
    });

    it('should handle very long conversation (10+ messages)', async () => {
      const onToken = jest.fn();
      const allPrompts = (mockOllamaService as any).allPrompts;

      let sessionId: string | null = null;

      // Send 15 messages
      for (let i = 1; i <= 15; i++) {
        const result = await chatUseCase.sendMessageWithStreaming(
          'user-123',
          { content: `Message ${i}`, sessionId },
          onToken
        );
        sessionId = result.sessionId;
      }

      // Verify last prompt doesn't have duplicates
      const lastPrompt = allPrompts[allPrompts.length - 1];
      
      // Check that "Message 15" appears only once as a user message
      const count = (lastPrompt.match(/User: Message 15/g) || []).length;
      expect(count).toBe(1);

      // Note: buildConversationContext limits to last 10 messages
      // So older messages might not appear in the last prompt
      console.log('✅ Long conversation handled without duplicates');
      console.log(`   Total prompts sent: ${allPrompts.length}`);
      console.log(`   Last message appears: ${count} time(s)`);
    });
  });
});
