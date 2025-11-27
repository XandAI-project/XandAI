"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const chat_use_case_1 = require("./chat.use-case");
const ollama_service_1 = require("../../infrastructure/services/ollama.service");
const stable_diffusion_service_1 = require("../../infrastructure/services/stable-diffusion.service");
describe('ChatUseCase', () => {
    let chatUseCase;
    let mockChatSessionRepository;
    let mockChatMessageRepository;
    let mockUserRepository;
    let mockOllamaService;
    let mockStableDiffusionService;
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                chat_use_case_1.ChatUseCase,
                { provide: 'IChatSessionRepository', useValue: mockChatSessionRepository },
                { provide: 'IChatMessageRepository', useValue: mockChatMessageRepository },
                { provide: 'IUserRepository', useValue: mockUserRepository },
                { provide: ollama_service_1.OllamaService, useValue: mockOllamaService },
                { provide: stable_diffusion_service_1.StableDiffusionService, useValue: mockStableDiffusionService },
            ],
        }).compile();
        chatUseCase = module.get(chat_use_case_1.ChatUseCase);
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
            await expect(chatUseCase.createSession('invalid-user', { title: 'Test' })).rejects.toThrow(common_1.NotFoundException);
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
            await expect(chatUseCase.getSessionWithMessages('user-123', 'invalid-session')).rejects.toThrow(common_1.NotFoundException);
        });
        it('should throw ForbiddenException when session belongs to another user', async () => {
            mockChatSessionRepository.findWithMessages.mockResolvedValueOnce({
                ...mockSession,
                userId: 'other-user',
            });
            await expect(chatUseCase.getSessionWithMessages('user-123', 'session-123')).rejects.toThrow(common_1.ForbiddenException);
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
            await expect(chatUseCase.sendMessage('user-123', {
                content: 'Hello',
                sessionId: 'invalid-session',
            })).rejects.toThrow(common_1.NotFoundException);
        });
        it('should throw ForbiddenException when session belongs to another user', async () => {
            mockChatSessionRepository.findById.mockResolvedValueOnce({
                ...mockSession,
                userId: 'other-user',
            });
            await expect(chatUseCase.sendMessage('user-123', {
                content: 'Hello',
                sessionId: 'session-123',
            })).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should save user and assistant messages', async () => {
            await chatUseCase.sendMessage('user-123', { content: 'Hello' });
            expect(mockChatMessageRepository.create).toHaveBeenCalledTimes(2);
        });
        it('should use custom model if provided', async () => {
            await chatUseCase.sendMessage('user-123', {
                content: 'Hello',
                model: 'mistral',
            });
            expect(mockOllamaService.generateResponse).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'mistral' }));
        });
    });
    describe('sendMessageWithStreaming', () => {
        it('should stream response and save messages', async () => {
            const onToken = jest.fn();
            await chatUseCase.sendMessageWithStreaming('user-123', { content: 'Hello' }, onToken);
            expect(mockOllamaService.generateResponseWithStreaming).toHaveBeenCalled();
            expect(mockChatMessageRepository.create).toHaveBeenCalledTimes(2);
        });
        it('should throw ForbiddenException for unauthorized session', async () => {
            mockChatSessionRepository.findById.mockResolvedValueOnce({
                ...mockSession,
                userId: 'other-user',
            });
            await expect(chatUseCase.sendMessageWithStreaming('user-123', { content: 'Hello', sessionId: 'session-123' }, jest.fn())).rejects.toThrow(common_1.ForbiddenException);
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
            await expect(chatUseCase.getSessionMessages('user-123', 'session-123')).rejects.toThrow(common_1.ForbiddenException);
        });
    });
    describe('deleteSession', () => {
        it('should soft delete a session', async () => {
            await chatUseCase.deleteSession('user-123', 'session-123');
            expect(mockChatSessionRepository.softDelete).toHaveBeenCalledWith('session-123');
        });
        it('should throw ForbiddenException for unauthorized deletion', async () => {
            mockChatSessionRepository.belongsToUser.mockResolvedValueOnce(false);
            await expect(chatUseCase.deleteSession('user-123', 'session-123')).rejects.toThrow(common_1.ForbiddenException);
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
});
//# sourceMappingURL=chat.use-case.spec.js.map