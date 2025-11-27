"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_use_case_1 = require("../../application/use-cases/chat.use-case");
const chat_dto_1 = require("../../application/dto/chat.dto");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
let ChatController = class ChatController {
    constructor(chatUseCase) {
        this.chatUseCase = chatUseCase;
    }
    async createSession(req, createSessionDto) {
        return await this.chatUseCase.createSession(req.user.id, createSessionDto);
    }
    async getUserSessions(req, page, limit) {
        return await this.chatUseCase.getUserSessions(req.user.id, page, limit);
    }
    async getSessionWithMessages(req, sessionId) {
        return await this.chatUseCase.getSessionWithMessages(req.user.id, sessionId);
    }
    async updateSession(req, sessionId, updateSessionDto) {
        return await this.chatUseCase.updateSession(req.user.id, sessionId, updateSessionDto);
    }
    async archiveSession(req, sessionId) {
        return await this.chatUseCase.archiveSession(req.user.id, sessionId);
    }
    async deleteSession(req, sessionId) {
        return await this.chatUseCase.deleteSession(req.user.id, sessionId);
    }
    async sendMessage(req, sendMessageDto) {
        return await this.chatUseCase.sendMessage(req.user.id, sendMessageDto);
    }
    async sendMessageStream(req, sendMessageDto, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const result = await this.chatUseCase.sendMessageWithStreaming(req.user.id, sendMessageDto, (token, fullText) => {
                res.write(`data: ${JSON.stringify({ token, fullText, done: false })}\n\n`);
            });
            if (result && result.isImageGeneration) {
                res.write(`data: ${JSON.stringify({
                    token: result.content,
                    fullText: result.content,
                    attachments: result.attachments,
                    isImageGeneration: true,
                    done: false
                })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
            res.end();
        }
    }
    async sendMessageToSession(req, sessionId, messageData) {
        const sendMessageDto = {
            sessionId,
            content: messageData.content,
            model: messageData.model,
            temperature: messageData.temperature,
            metadata: {
                ollamaConfig: messageData.ollamaConfig
            }
        };
        const response = await this.chatUseCase.sendMessage(req.user.id, sendMessageDto);
        return {
            userMessage: response.userMessage,
            assistantMessage: response.assistantMessage,
        };
    }
    async addMessageToSession(req, sessionId, messageData) {
        return await this.chatUseCase.addMessageToSession(req.user.id, sessionId, messageData.content, messageData.role);
    }
    async getSessionMessages(req, sessionId, page, limit) {
        return await this.chatUseCase.getSessionMessages(req.user.id, sessionId, page, limit);
    }
    async getRecentMessages(req, limit) {
        return await this.chatUseCase.getRecentMessages(req.user.id, limit);
    }
    async searchMessages(req, searchDto) {
        return await this.chatUseCase.searchMessages(req.user.id, searchDto);
    }
    async createOrUpdateMessage(req, messageId, messageData) {
        return await this.chatUseCase.createOrUpdateMessage(req.user.id, messageId, messageData);
    }
    async attachImageToMessage(req, messageId, attachmentData) {
        return await this.chatUseCase.attachImageToMessage(req.user.id, messageId, attachmentData.imageUrl, attachmentData.filename, attachmentData.originalPrompt, attachmentData.metadata);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('sessions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.CreateChatSessionDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUserSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getSessionWithMessages", null);
__decorate([
    (0, common_1.Put)('sessions/:sessionId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, chat_dto_1.UpdateChatSessionDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Put)('sessions/:sessionId/archive'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "archiveSession", null);
__decorate([
    (0, common_1.Delete)('sessions/:sessionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('messages/stream'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessageStream", null);
__decorate([
    (0, common_1.Post)('sessions/:sessionId/send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessageToSession", null);
__decorate([
    (0, common_1.Post)('sessions/:sessionId/messages'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addMessageToSession", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId/messages'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getSessionMessages", null);
__decorate([
    (0, common_1.Get)('messages/recent'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getRecentMessages", null);
__decorate([
    (0, common_1.Post)('messages/search'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, chat_dto_1.SearchMessagesDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "searchMessages", null);
__decorate([
    (0, common_1.Put)('messages/:messageId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('messageId')),
    __param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createOrUpdateMessage", null);
__decorate([
    (0, common_1.Post)('messages/:messageId/attachments/image'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('messageId')),
    __param(2, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "attachImageToMessage", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_use_case_1.ChatUseCase])
], ChatController);
//# sourceMappingURL=chat.controller.js.map