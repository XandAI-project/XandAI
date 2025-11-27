/**
 * Integration tests for Chat functionality
 * Tests the complete flow from frontend to backend
 */

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  store: {},
  getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

import { ChatApiRepository } from '../../infrastructure/api/ChatApiRepository';
import { ChatService } from '../../application/services/ChatService';
import { Message } from '../../domain/entities/Message';

describe('Chat Integration Tests', () => {
  let chatService;
  let repository;

  beforeEach(() => {
    mockFetch.mockReset();
    mockLocalStorage.clear();
    mockLocalStorage.store = {
      'xandai_auth_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      'ollama-config': JSON.stringify({
        selectedModel: 'llama3.2',
        enabled: true,
        baseUrl: 'http://localhost:11434',
        timeout: 300000,
      }),
    };

    repository = new ChatApiRepository();
    chatService = new ChatService(repository);
  });

  describe('Complete Chat Flow', () => {
    it('should complete a full chat interaction', async () => {
      // Mock backend response
      const mockBackendResponse = {
        userMessage: {
          id: 'user-msg-123',
          content: 'Hello, how are you?',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
        assistantMessage: {
          id: 'assistant-msg-456',
          content: 'I am doing well, thank you for asking! How can I help you today?',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        },
        session: {
          id: 'session-789',
          title: 'Hello, how are',
          status: 'active',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      // Send message through ChatService
      const result = await chatService.sendMessage('Hello, how are you?');

      // Verify the result
      expect(result.userMessage).toBeDefined();
      expect(result.userMessage.content).toBe('Hello, how are you?');
      expect(result.assistantMessage).toBeDefined();
      expect(result.assistantMessage.content).toContain('doing well');

      // Verify API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/chat/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.content).toBe('Hello, how are you?');
      expect(requestBody.model).toBe('llama3.2');
    });

    it('should handle streaming chat response', async () => {
      // Mock SSE stream
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"token":"Hello","fullText":"Hello","done":false}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"token":" there","fullText":"Hello there","done":false}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"token":"!","fullText":"Hello there!","done":false}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"done":true}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const tokens = [];
      const onToken = (token, fullText, isDone) => {
        tokens.push({ token, fullText, isDone });
      };

      await repository.sendMessage('Hello', onToken);

      // Verify streaming endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/chat/messages/stream',
        expect.any(Object)
      );

      // Verify tokens were received
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[tokens.length - 1].isDone).toBe(true);
    });
  });

  describe('Image Generation Flow', () => {
    it('should handle image generation requests', async () => {
      const mockBackendResponse = {
        userMessage: {
          id: 'user-msg-123',
          content: 'Generate an image of a cat',
          role: 'user',
        },
        assistantMessage: {
          id: 'assistant-msg-456',
          content: '🎨 Here is the image I generated for you!',
          role: 'assistant',
          attachments: [
            {
              type: 'image',
              url: '/api/v1/images/generated/cat-123.png',
              filename: 'cat-123.png',
              originalPrompt: 'a cute fluffy cat',
            },
          ],
        },
        session: { id: 'session-789' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendResponse,
      });

      const result = await chatService.sendMessage('Generate an image of a cat');

      expect(result.assistantMessage.attachments).toBeDefined();
      expect(result.assistantMessage.attachments).toHaveLength(1);
      expect(result.assistantMessage.attachments[0].type).toBe('image');
      expect(result.assistantMessage.attachments[0].url).toContain('/images/');
    });
  });

  describe('Session Management', () => {
    it('should load existing session messages', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'msg-2',
          content: 'Hi there!',
          role: 'assistant',
          createdAt: '2024-01-01T00:00:01Z',
        },
        {
          id: 'msg-3',
          content: 'How are you?',
          role: 'user',
          createdAt: '2024-01-01T00:00:02Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const messages = await repository.getMessageHistory();

      expect(messages).toHaveLength(3);
      // Messages should be sorted chronologically
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe('Hi there!');
      expect(messages[2].content).toBe('How are you?');
    });

    it('should clear chat history', async () => {
      // Mock GET sessions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [
            { id: 'session-1' },
            { id: 'session-2' },
          ],
        }),
      });

      // Mock DELETE for each session
      mockFetch.mockResolvedValue({ ok: true, status: 204 });

      await repository.clearHistory();

      // Should have called GET sessions + DELETE for each session
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(repository.currentSessionId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(chatService.sendMessage('Hello')).rejects.toThrow();
    });

    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(repository.sendMessage('Hello')).rejects.toThrow('401');
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(repository.sendMessage('Hello')).rejects.toThrow('500');
    });

    it('should handle missing auth token', async () => {
      mockLocalStorage.store = {}; // Remove auth token

      await expect(repository.sendMessage('Hello')).rejects.toThrow(
        'Token de autenticação'
      );
    });
  });

  describe('Model Configuration', () => {
    it('should use model from localStorage config', async () => {
      mockLocalStorage.store['ollama-config'] = JSON.stringify({
        selectedModel: 'mistral',
        enabled: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assistantMessage: { content: 'Response' },
          session: { id: 'session-123' },
        }),
      });

      await repository.sendMessage('Hello');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('mistral');
    });

    it('should pass ollamaConfig to backend', async () => {
      mockLocalStorage.store['ollama-config'] = JSON.stringify({
        selectedModel: 'llama3.2',
        enabled: true,
        baseUrl: 'http://custom:11434',
        timeout: 600000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          assistantMessage: { content: 'Response' },
          session: { id: 'session-123' },
        }),
      });

      await repository.sendMessage('Hello');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.metadata.ollamaConfig.baseUrl).toBe('http://custom:11434');
    });
  });

  describe('Backend Availability', () => {
    it('should check backend availability', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const isAvailable = await repository.isBackendAvailable();

      expect(isAvailable).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/health',
        expect.any(Object)
      );
    });

    it('should return false when backend is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const isAvailable = await repository.isBackendAvailable();

      expect(isAvailable).toBe(false);
    });
  });
});

