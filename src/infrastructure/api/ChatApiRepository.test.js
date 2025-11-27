import { ChatApiRepository } from './ChatApiRepository';
import { Message } from '../../domain/entities/Message';

// Mock fetch globally
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

describe('ChatApiRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new ChatApiRepository();
    mockFetch.mockReset();
    mockLocalStorage.clear();
    mockLocalStorage.store = {};
  });

  describe('Authentication', () => {
    it('should get auth token from localStorage', () => {
      mockLocalStorage.store['xandai_auth_token'] = 'test-token';
      
      const token = repository.getAuthToken();
      
      expect(token).toBe('test-token');
    });

    it('should include auth header in requests', () => {
      mockLocalStorage.store['xandai_auth_token'] = 'test-token';
      
      const headers = repository.getAuthHeaders();
      
      expect(headers['Authorization']).toBe('Bearer test-token');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockLocalStorage.store['xandai_auth_token'] = 'test-token';
      mockLocalStorage.store['ollama-config'] = JSON.stringify({
        selectedModel: 'llama3.2',
        enabled: true,
        baseUrl: 'http://localhost:11434',
      });
    });

    it('should send message to backend without streaming', async () => {
      const mockResponse = {
        assistantMessage: {
          content: 'AI Response',
          id: 'msg-123',
        },
        session: { id: 'session-123' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await repository.sendMessage('Hello');

      expect(result).toBe('AI Response');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/chat/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should use selected model from localStorage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assistantMessage: { content: 'Response' } }),
      });

      await repository.sendMessage('Hello');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('llama3.2');
    });

    it('should fallback to default model when not configured', async () => {
      mockLocalStorage.store['ollama-config'] = '{}';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assistantMessage: { content: 'Response' } }),
      });

      await repository.sendMessage('Hello');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('llama3.2');
    });

    it('should handle attachments in response', async () => {
      const mockResponse = {
        assistantMessage: {
          content: 'Here is your image',
          attachments: [
            { type: 'image', url: '/images/test.png', filename: 'test.png' },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await repository.sendMessage('Generate an image');

      expect(result.content).toBe('Here is your image');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].url).toBe('/images/test.png');
    });

    it('should use streaming endpoint when callback provided', async () => {
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"token":"Hello","fullText":"Hello","done":false}\n\n'),
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

      const onToken = jest.fn();
      await repository.sendMessage('Hello', onToken);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/chat/messages/stream',
        expect.any(Object)
      );
      expect(onToken).toHaveBeenCalled();
    });

    it('should throw error when not authenticated', async () => {
      mockLocalStorage.store = {};

      await expect(repository.sendMessage('Hello')).rejects.toThrow(
        'Token de autenticação não encontrado'
      );
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(repository.sendMessage('Hello')).rejects.toThrow(
        'Erro na requisição: 500'
      );
    });
  });

  describe('getMessageHistory', () => {
    beforeEach(() => {
      mockLocalStorage.store['xandai_auth_token'] = 'test-token';
    });

    it('should fetch recent messages', async () => {
      const mockMessages = [
        { id: '1', content: 'Hello', role: 'user', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', content: 'Hi!', role: 'assistant', createdAt: '2024-01-01T00:01:00Z' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const result = await repository.getMessageHistory();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Message);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/chat/messages/recent',
        expect.any(Object)
      );
    });

    it('should return sorted messages (oldest first)', async () => {
      const mockMessages = [
        { id: '2', content: 'Later', role: 'assistant', createdAt: '2024-01-01T00:01:00Z' },
        { id: '1', content: 'First', role: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const result = await repository.getMessageHistory();

      expect(result[0].content).toBe('First');
      expect(result[1].content).toBe('Later');
    });

    it('should return empty array when not authenticated', async () => {
      mockLocalStorage.store = {};

      const result = await repository.getMessageHistory();

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should include attachments in messages', async () => {
      const mockMessages = [
        {
          id: '1',
          content: 'Image',
          role: 'assistant',
          createdAt: '2024-01-01T00:00:00Z',
          attachments: [{ type: 'image', url: '/image.png', filename: 'image.png' }],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      const result = await repository.getMessageHistory();

      expect(result[0].attachments).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    beforeEach(() => {
      mockLocalStorage.store['xandai_auth_token'] = 'test-token';
    });

    it('should delete all sessions', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sessions: [{ id: 'session-1' }, { id: 'session-2' }] }),
        })
        .mockResolvedValue({ ok: true, status: 204 });

      await repository.clearHistory();

      // 1 GET + 2 DELETE calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(repository.currentSessionId).toBeNull();
    });

    it('should handle empty sessions list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: [] }),
      });

      await repository.clearHistory();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear local state even on error', async () => {
      repository.currentSessionId = 'session-123';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(repository.clearHistory()).rejects.toThrow();
      expect(repository.currentSessionId).toBeNull();
    });
  });

  describe('isBackendAvailable', () => {
    it('should return true when backend is available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await repository.isBackendAvailable();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/health',
        expect.any(Object)
      );
    });

    it('should return false when backend is unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await repository.isBackendAvailable();

      expect(result).toBe(false);
    });
  });

  describe('setCurrentSessionId', () => {
    it('should set current session ID', () => {
      repository.setCurrentSessionId('session-123');

      expect(repository.currentSessionId).toBe('session-123');
    });
  });
});

