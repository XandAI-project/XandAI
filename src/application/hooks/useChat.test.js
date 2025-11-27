import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { ChatService } from '../services/ChatService';
import { ChatApiRepository } from '../../infrastructure/api/ChatApiRepository';

// Mock the ChatApiRepository
jest.mock('../../infrastructure/api/ChatApiRepository');
jest.mock('../../infrastructure/mock-api/MockChatRepository');

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

describe('useChat Hook', () => {
  let mockRepository;

  beforeEach(() => {
    mockLocalStorage.store = {
      'xandai_auth_token': 'test-token',
      'ollama-config': JSON.stringify({
        selectedModel: 'llama3.2',
        enabled: true,
      }),
    };

    mockRepository = {
      isBackendAvailable: jest.fn().mockResolvedValue(true),
      sendMessage: jest.fn().mockResolvedValue('AI Response'),
      getMessageHistory: jest.fn().mockResolvedValue([]),
      clearHistory: jest.fn().mockResolvedValue(undefined),
      setCurrentSessionId: jest.fn(),
    };

    ChatApiRepository.mockImplementation(() => mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty messages', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
      });
    });

    it('should set isLoading to false after initialization', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should detect backend connection', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isBackendConnected).toBe(true);
      });
    });

    it('should load message history on init', async () => {
      const mockHistory = [
        { id: '1', content: 'Hello', sender: 'user', timestamp: new Date() },
      ];
      mockRepository.getMessageHistory.mockResolvedValueOnce(mockHistory);

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(mockRepository.getMessageHistory).toHaveBeenCalled();
      });
    });
  });

  describe('sendMessage', () => {
    it('should add user message immediately', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.messages.some(m => m.content === 'Hello')).toBe(true);
    });

    it('should add assistant response after API call', async () => {
      mockRepository.sendMessage.mockResolvedValueOnce('AI Response');

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.messages.some(m => m.content === 'AI Response')).toBe(true);
      });
    });

    it('should set isLoading during message send', async () => {
      let resolvePromise;
      mockRepository.sendMessage.mockImplementationOnce(() => 
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      let sendPromise;
      act(() => {
        sendPromise = result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePromise('Response');
        await sendPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle error during message send', async () => {
      mockRepository.sendMessage.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should not send empty messages', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(mockRepository.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle attachments in response', async () => {
      mockRepository.sendMessage.mockResolvedValueOnce({
        content: 'Image generated',
        attachments: [{ type: 'image', url: '/image.png' }],
      });

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Generate an image');
      });

      await waitFor(() => {
        const assistantMsg = result.current.messages.find(m => m.sender === 'assistant');
        expect(assistantMsg?.attachments).toBeDefined();
      });
    });
  });

  describe('clearHistory', () => {
    it('should clear all messages', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Add a message first
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.messages.length).toBeGreaterThan(0);

      // Clear history
      await act(async () => {
        await result.current.clearHistory();
      });

      expect(result.current.messages).toEqual([]);
    });

    it('should call repository clearHistory', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(mockRepository.clearHistory).toHaveBeenCalled();
    });
  });

  describe('loadExternalMessages', () => {
    it('should load messages from external source', async () => {
      const { result } = renderHook(() => useChat());

      const externalMessages = [
        { id: '1', content: 'Hello', role: 'user', createdAt: '2024-01-01T00:00:00Z' },
        { id: '2', content: 'Hi!', role: 'assistant', createdAt: '2024-01-01T00:01:00Z' },
      ];

      act(() => {
        result.current.loadExternalMessages(externalMessages, 'session-123');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.currentSessionId).toBe('session-123');
    });

    it('should sort messages chronologically', async () => {
      const { result } = renderHook(() => useChat());

      const externalMessages = [
        { id: '2', content: 'Later', role: 'assistant', createdAt: '2024-01-01T00:01:00Z' },
        { id: '1', content: 'First', role: 'user', createdAt: '2024-01-01T00:00:00Z' },
      ];

      act(() => {
        result.current.loadExternalMessages(externalMessages, 'session-123');
      });

      expect(result.current.messages[0].content).toBe('First');
      expect(result.current.messages[1].content).toBe('Later');
    });

    it('should handle invalid input gracefully', async () => {
      const { result } = renderHook(() => useChat());

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      act(() => {
        result.current.loadExternalMessages('invalid');
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setSession', () => {
    it('should set current session ID', async () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.setSession('session-456');
      });

      expect(result.current.currentSessionId).toBe('session-456');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockRepository.sendMessage.mockRejectedValueOnce(new Error('Test Error'));

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('computed properties', () => {
    it('should compute hasMessages correctly', async () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.hasMessages).toBe(false);

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.hasMessages).toBe(true);
    });

    it('should compute messageCount correctly', async () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.messageCount).toBe(0);

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      // Should have user message + assistant message
      expect(result.current.messageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updateMessageAttachment', () => {
    it('should update message attachments', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const messageId = result.current.messages[0]?.id;

      if (messageId) {
        act(() => {
          result.current.updateMessageAttachment(messageId, {
            type: 'image',
            url: '/new-image.png',
          });
        });

        const updatedMessage = result.current.messages.find(m => m.id === messageId);
        expect(updatedMessage?.attachments).toBeDefined();
      }
    });
  });
});

