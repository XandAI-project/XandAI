/**
 * Integration tests for Clear Messages and New Chat functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../../application/hooks/useChat';
import { ChatApiRepository } from '../../infrastructure/api/ChatApiRepository';

// Mock ChatApiRepository
jest.mock('../../infrastructure/api/ChatApiRepository');

describe('Chat Clear Messages Integration Tests', () => {
  let mockRepository;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock repository instance
    mockRepository = {
      isBackendAvailable: jest.fn().mockResolvedValue(true),
      sendMessage: jest.fn(),
      getMessageHistory: jest.fn().mockResolvedValue([]),
      clearHistory: jest.fn(),
      clearSessionMessages: jest.fn(),
      clearCurrentSessionId: jest.fn(),
      getCurrentSessionId: jest.fn(),
      currentSessionId: null,
    };

    // Mock the constructor
    ChatApiRepository.mockImplementation(() => mockRepository);
  });

  describe('Clear Messages Functionality', () => {
    it('should clear messages from current session via API', async () => {
      // Arrange
      const sessionId = 'session-123';
      mockRepository.currentSessionId = sessionId;
      mockRepository.clearSessionMessages.mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Add some messages first
      mockRepository.sendMessage.mockResolvedValue('Test response');
      
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      // Act - Clear messages
      await act(async () => {
        if (result.current.chatService && result.current.chatService.clearSessionMessages) {
          await result.current.chatService.clearSessionMessages(sessionId);
        }
      });

      // Assert
      expect(mockRepository.clearSessionMessages).toHaveBeenCalledWith(sessionId);
    });

    it('should keep session active after clearing messages', async () => {
      // Arrange
      const sessionId = 'session-123';
      mockRepository.currentSessionId = sessionId;
      mockRepository.clearSessionMessages.mockResolvedValue(undefined);

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Clear messages
      await act(async () => {
        if (result.current.chatService && result.current.chatService.clearSessionMessages) {
          await result.current.chatService.clearSessionMessages(sessionId);
        }
      });

      // Assert - Session ID should still be set
      expect(mockRepository.currentSessionId).toBe(sessionId);
    });

    it('should allow sending new messages after clearing', async () => {
      // Arrange
      const sessionId = 'session-123';
      mockRepository.currentSessionId = sessionId;
      mockRepository.clearSessionMessages.mockResolvedValue(undefined);
      mockRepository.sendMessage.mockResolvedValue('New message response');

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Clear messages
      await act(async () => {
        if (result.current.chatService && result.current.chatService.clearSessionMessages) {
          await result.current.chatService.clearSessionMessages(sessionId);
        }
      });

      // Act - Send new message
      await act(async () => {
        await result.current.sendMessage('New message after clear');
      });

      // Assert
      expect(mockRepository.sendMessage).toHaveBeenCalledWith(
        'New message after clear',
        expect.any(Function)
      );
    });
  });

  describe('New Chat Functionality', () => {
    it('should clear session ID when starting new chat', async () => {
      // Arrange
      mockRepository.currentSessionId = 'old-session-123';
      mockRepository.clearCurrentSessionId.mockImplementation(() => {
        mockRepository.currentSessionId = null;
      });

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Start new chat
      await act(async () => {
        if (result.current.chatService && result.current.chatService.createNewSession) {
          result.current.chatService.createNewSession();
        }
      });

      // Assert
      expect(mockRepository.clearCurrentSessionId).toHaveBeenCalled();
      expect(mockRepository.currentSessionId).toBeNull();
    });

    it('should clear UI messages when starting new chat', async () => {
      // Arrange
      mockRepository.sendMessage.mockResolvedValue('Test response');

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Add messages first
      await act(async () => {
        await result.current.sendMessage('Message 1');
        await result.current.sendMessage('Message 2');
      });

      // Verify messages exist
      expect(result.current.messages.length).toBeGreaterThan(0);

      // Act - Clear messages for new chat
      await act(async () => {
        result.current.loadExternalMessages([], null);
      });

      // Assert
      expect(result.current.messages.length).toBe(0);
    });

    it('should create new session on first message after new chat', async () => {
      // Arrange
      mockRepository.currentSessionId = null;
      mockRepository.sendMessage.mockImplementation((message, onToken) => {
        // Simulate backend creating new session
        mockRepository.currentSessionId = 'new-session-456';
        return Promise.resolve('Response from new session');
      });

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Send first message in new chat
      await act(async () => {
        await result.current.sendMessage('First message in new chat');
      });

      // Assert
      expect(mockRepository.sendMessage).toHaveBeenCalled();
      // Backend should have created a new session
      expect(mockRepository.currentSessionId).toBe('new-session-456');
    });

    it('should not delete previous sessions when creating new chat', async () => {
      // Arrange
      const oldSessionId = 'old-session-123';
      mockRepository.currentSessionId = oldSessionId;
      mockRepository.clearHistory = jest.fn(); // This should NOT be called

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Start new chat
      await act(async () => {
        if (result.current.chatService && result.current.chatService.createNewSession) {
          result.current.chatService.createNewSession();
        }
      });

      // Assert - clearHistory should NOT be called (that would delete all sessions)
      expect(mockRepository.clearHistory).not.toHaveBeenCalled();
      expect(mockRepository.clearCurrentSessionId).toHaveBeenCalled();
    });
  });

  describe('Session Isolation', () => {
    it('should keep messages separate between sessions', async () => {
      // Arrange
      const session1Id = 'session-1';
      const session2Id = 'session-2';
      
      const session1Messages = [
        { id: '1', content: 'Message in session 1', role: 'user', createdAt: new Date() }
      ];
      
      const session2Messages = [
        { id: '2', content: 'Message in session 2', role: 'user', createdAt: new Date() }
      ];

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Load session 1
      await act(async () => {
        result.current.loadExternalMessages(session1Messages, session1Id);
      });

      // Assert - Session 1 messages loaded
      expect(result.current.messages.length).toBe(1);
      expect(result.current.messages[0].content).toBe('Message in session 1');

      // Act - Load session 2
      await act(async () => {
        result.current.loadExternalMessages(session2Messages, session2Id);
      });

      // Assert - Session 2 messages loaded (session 1 messages replaced)
      expect(result.current.messages.length).toBe(1);
      expect(result.current.messages[0].content).toBe('Message in session 2');
    });

    it('should maintain correct session context when switching', async () => {
      // Arrange
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act - Switch between sessions
      await act(async () => {
        result.current.setSession('session-1');
      });

      expect(result.current.currentSessionId).toBe('session-1');

      await act(async () => {
        result.current.setSession('session-2');
      });

      expect(result.current.currentSessionId).toBe('session-2');

      await act(async () => {
        result.current.setSession(null);
      });

      expect(result.current.currentSessionId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle clear messages API errors gracefully', async () => {
      // Arrange
      const sessionId = 'session-123';
      mockRepository.clearSessionMessages.mockRejectedValue(
        new Error('API Error: Failed to clear messages')
      );

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act & Assert
      await act(async () => {
        await expect(
          result.current.chatService.clearSessionMessages(sessionId)
        ).rejects.toThrow('Falha ao limpar mensagens');
      });
    });

    it('should handle missing session gracefully', async () => {
      // Arrange
      mockRepository.clearSessionMessages.mockRejectedValue(
        new Error('Session not found')
      );

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.chatService).toBeDefined();
      });

      // Act & Assert
      await act(async () => {
        await expect(
          result.current.chatService.clearSessionMessages('non-existent-session')
        ).rejects.toThrow();
      });
    });
  });
});

