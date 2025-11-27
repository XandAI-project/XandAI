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
var ChatMessage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const typeorm_1 = require("typeorm");
const chat_session_entity_1 = require("./chat-session.entity");
let ChatMessage = ChatMessage_1 = class ChatMessage {
    isUserMessage() {
        return this.role === 'user';
    }
    isAssistantMessage() {
        return this.role === 'assistant';
    }
    isSystemMessage() {
        return this.role === 'system';
    }
    markAsProcessing() {
        this.status = 'processing';
        this.processedAt = new Date();
    }
    markAsDelivered() {
        this.status = 'delivered';
        this.processedAt = new Date();
    }
    markAsError(errorMessage) {
        this.status = 'error';
        this.error = errorMessage;
        this.processedAt = new Date();
    }
    getWordCount() {
        return this.content.split(/\s+/).filter(word => word.length > 0).length;
    }
    getCharacterCount() {
        return this.content.length;
    }
    truncate(maxLength = 100) {
        if (this.content.length <= maxLength) {
            return this.content;
        }
        return this.content.substring(0, maxLength) + '...';
    }
    static createUserMessage(content, chatSessionId) {
        const message = new ChatMessage_1();
        message.content = content;
        message.role = 'user';
        message.chatSessionId = chatSessionId;
        message.status = 'sent';
        return message;
    }
    static createAssistantMessage(content, chatSessionId, metadata) {
        const message = new ChatMessage_1();
        message.content = content;
        message.role = 'assistant';
        message.chatSessionId = chatSessionId;
        message.status = 'delivered';
        message.metadata = metadata;
        return message;
    }
    static createSystemMessage(content, chatSessionId) {
        const message = new ChatMessage_1();
        message.content = content;
        message.role = 'system';
        message.chatSessionId = chatSessionId;
        message.status = 'delivered';
        return message;
    }
    addAttachment(attachment) {
        if (!this.attachments) {
            this.attachments = [];
        }
        this.attachments.push(attachment);
    }
    removeAttachment(filename) {
        if (this.attachments) {
            this.attachments = this.attachments.filter(att => att.filename !== filename);
        }
    }
    getImageAttachments() {
        return this.attachments?.filter(att => att.type === 'image') || [];
    }
    hasAttachments() {
        return this.attachments && this.attachments.length > 0;
    }
    isValidContent() {
        return this.content && this.content.trim().length > 0;
    }
    isValidRole() {
        return ['user', 'assistant', 'system'].includes(this.role);
    }
};
exports.ChatMessage = ChatMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChatMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ChatMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ChatMessage.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ChatMessage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], ChatMessage.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'sent' }),
    __metadata("design:type", String)
], ChatMessage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ChatMessage.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ChatMessage.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ChatMessage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ChatMessage.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ChatMessage.prototype, "chatSessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_session_entity_1.ChatSession, (chatSession) => chatSession.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'chatSessionId' }),
    __metadata("design:type", chat_session_entity_1.ChatSession)
], ChatMessage.prototype, "chatSession", void 0);
exports.ChatMessage = ChatMessage = ChatMessage_1 = __decorate([
    (0, typeorm_1.Entity)('chat_messages')
], ChatMessage);
//# sourceMappingURL=chat-message.entity.js.map