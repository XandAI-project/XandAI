import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatUseCase } from './chat.use-case';
import { OllamaService } from '../../infrastructure/services/ollama.service';
import { StableDiffusionService } from '../../infrastructure/services/stable-diffusion.service';

/**
 * Tests for Chat Deletion Functionality
 */
describe('ChatUseCase - Delete Operations', () => {
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
    deletedAt: null,
    updateActivity: jest.fn(),
    getMessageCount: jest.fn().mockReturnValue(0),
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
      create: jest.fn(),
      findById: jest.fn(),
      findBySessionId: jest.fn().mockResolvedValue({ messages: [], total: 0 }),
      findRecentByUserId: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn().mockResolvedValue(mockUser),
    };

    mockOllamaService = {
      generateResponse: jest.fn(),
      generateResponseWithStreaming: jest.fn(),
      isImageGenerationRequest: jest.fn().mockReturnValue(false),
      generateConversationTitle: jest.fn(),
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

  describe('deleteSession', () => {
    it('should successfully delete a session that belongs to user', async () => {
      await chatUseCase.deleteSession('user-123', 'session-123');

      expect(mockChatSessionRepository.belongsToUser).toHaveBeenCalledWith('session-123', 'user-123');
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-123');
    });

    it('should throw ForbiddenException when trying to delete another users session', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.deleteSession('user-123', 'session-456')
      ).rejects.toThrow(ForbiddenException);

      expect(mockChatSessionRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should verify ownership before deletion', async () => {
      await chatUseCase.deleteSession('user-123', 'session-123');

      expect(mockChatSessionRepository.belongsToUser).toHaveBeenCalledBefore(
        mockChatSessionRepository.softDelete
      );
    });

    it('should handle deletion of non-existent session gracefully', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.deleteSession('user-123', 'non-existent-session')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archiveSession', () => {
    it('should successfully archive a session', async () => {
      await chatUseCase.archiveSession('user-123', 'session-123');

      expect(mockChatSessionRepository.belongsToUser).toHaveBeenCalledWith('session-123', 'user-123');
      expect(mockChatSessionRepository.archive).toHaveBeenCalledWith('session-123');
    });

    it('should throw ForbiddenException when archiving another users session', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.archiveSession('user-123', 'session-456')
      ).rejects.toThrow(ForbiddenException);

      expect(mockChatSessionRepository.archive).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Session Deletion', () => {
    it('should delete multiple sessions independently', async () => {
      const session1 = { ...mockSession, id: 'session-1' };
      const session2 = { ...mockSession, id: 'session-2' };
      const session3 = { ...mockSession, id: 'session-3' };

      mockChatSessionRepository.belongsToUser.mockResolvedValue(true);

      await chatUseCase.deleteSession('user-123', 'session-1');
      await chatUseCase.deleteSession('user-123', 'session-2');
      await chatUseCase.deleteSession('user-123', 'session-3');

      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledTimes(3);
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-1');
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-2');
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-3');
    });

    it('should not affect other sessions when deleting one', async () => {
      const sessions = [
        { ...mockSession, id: 'session-1', status: 'active' },
        { ...mockSession, id: 'session-2', status: 'active' },
        { ...mockSession, id: 'session-3', status: 'active' },
      ];

      mockChatSessionRepository.findByUserId.mockResolvedValueOnce({
        sessions: sessions,
        total: 3,
      });

      // Delete one session
      await chatUseCase.deleteSession('user-123', 'session-2');

      // Verify only the specified session was deleted
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-2');
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Current Session Workflow', () => {
    it('should allow deleting current active session', async () => {
      // Create a session and send messages
      const result = await chatUseCase.sendMessage('user-123', {
        content: 'Test message',
      });

      const sessionId = result.session.id;

      // Delete the session
      await chatUseCase.deleteSession('user-123', sessionId);

      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith(sessionId);
    });

    it('should handle deletion of session with messages', async () => {
      const messages = [
        { id: 'msg-1', content: 'Message 1', role: 'user' },
        { id: 'msg-2', content: 'Message 2', role: 'assistant' },
      ];

      mockChatMessageRepository.findBySessionId.mockResolvedValueOnce({
        messages: messages,
        total: 2,
      });

      await chatUseCase.deleteSession('user-123', 'session-123');

      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-123');
    });
  });

  describe('Soft Delete vs Hard Delete', () => {
    it('should use soft delete (not permanent deletion)', async () => {
      await chatUseCase.deleteSession('user-123', 'session-123');

      // Verify soft delete is called (not a hard delete)
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalled();
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-123');
    });

    it('should mark session as deleted but keep data', async () => {
      const deletedSession = {
        ...mockSession,
        status: 'deleted',
        deletedAt: new Date(),
      };

      mockChatSessionRepository.softDelete.mockImplementationOnce(async (id) => {
        mockSession.status = 'deleted';
        mockSession.deletedAt = new Date();
      });

      await chatUseCase.deleteSession('user-123', 'session-123');

      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-123');
    });
  });

  describe('Authorization and Security', () => {
    it('should prevent user from deleting sessions they dont own', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.deleteSession('user-123', 'other-user-session')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify user ownership for each delete operation', async () => {
      await chatUseCase.deleteSession('user-123', 'session-1');
      await chatUseCase.deleteSession('user-123', 'session-2');

      expect(mockChatSessionRepository.belongsToUser).toHaveBeenCalledTimes(2);
      expect(mockChatSessionRepository.belongsToUser).toHaveBeenNthCalledWith(1, 'session-1', 'user-123');
      expect(mockChatSessionRepository.belongsToUser).toHaveBeenNthCalledWith(2, 'session-2', 'user-123');
    });

    it('should not leak session information in error messages', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      try {
        await chatUseCase.deleteSession('user-123', 'secret-session');
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        // Error message should not reveal session details
        expect(error.message).not.toContain('secret-session');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle deletion of already deleted session', async () => {
      const deletedSession = {
        ...mockSession,
        status: 'deleted',
        deletedAt: new Date(),
      };

      mockChatSessionRepository.findById.mockResolvedValueOnce(deletedSession);

      // Should still succeed (idempotent)
      await chatUseCase.deleteSession('user-123', 'session-123');

      expect(mockChatSessionRepository.softDelete).toHaveBeenCalled();
    });

    it('should handle deletion with null or undefined sessionId gracefully', async () => {
      mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);

      await expect(
        chatUseCase.deleteSession('user-123', null as any)
      ).rejects.toThrow();
    });

    it('should handle concurrent deletion attempts', async () => {
      const deletePromises = [
        chatUseCase.deleteSession('user-123', 'session-123'),
        chatUseCase.deleteSession('user-123', 'session-123'),
        chatUseCase.deleteSession('user-123', 'session-123'),
      ];

      await Promise.all(deletePromises);

      // All should succeed (idempotent)
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledTimes(3);
    });
  });

  describe('Delete and Recreate Workflow', () => {
    it('should allow creating new session after deleting old one', async () => {
      // Delete existing session
      await chatUseCase.deleteSession('user-123', 'session-old');

      // Create new session
      const newSession = await chatUseCase.createSession('user-123', {
        title: 'New Session',
      });

      expect(newSession).toBeDefined();
      expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-old');
      expect(mockChatSessionRepository.create).toHaveBeenCalled();
    });

    it('should maintain separate session IDs after delete and recreate', async () => {
      const oldSessionId = 'session-old';
      const newSessionId = 'session-new';

      mockChatSessionRepository.create.mockResolvedValueOnce({
        ...mockSession,
        id: newSessionId,
      });

      await chatUseCase.deleteSession('user-123', oldSessionId);
      const newSession = await chatUseCase.createSession('user-123', {
        title: 'New Session',
      });

      expect(newSession.id).toBe(newSessionId);
      expect(newSession.id).not.toBe(oldSessionId);
    });
  });
});

