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
exports.ChatMessageRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_message_entity_1 = require("../../domain/entities/chat-message.entity");
let ChatMessageRepository = class ChatMessageRepository {
    constructor(messageRepository) {
        this.messageRepository = messageRepository;
    }
    async findById(id) {
        return await this.messageRepository.findOne({ where: { id } });
    }
    async create(messageData) {
        const message = this.messageRepository.create(messageData);
        return await this.messageRepository.save(message);
    }
    async update(id, messageData) {
        await this.messageRepository.update(id, messageData);
        const updatedMessage = await this.findById(id);
        if (!updatedMessage) {
            throw new Error('Mensagem não encontrada após atualização');
        }
        return updatedMessage;
    }
    async delete(id) {
        await this.messageRepository.delete(id);
    }
    async findBySessionId(sessionId, page = 1, limit = 50) {
        const [messages, total] = await this.messageRepository.findAndCount({
            where: { chatSessionId: sessionId },
            skip: (page - 1) * limit,
            take: limit,
            order: {
                createdAt: 'ASC',
            },
        });
        return { messages, total };
    }
    async findLastBySessionId(sessionId) {
        return await this.messageRepository.findOne({
            where: { chatSessionId: sessionId },
            order: {
                createdAt: 'DESC',
            },
        });
    }
    async findRecentByUserId(userId, limit = 50) {
        return await this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.chatSession', 'session')
            .where('session.userId = :userId', { userId })
            .andWhere('session.status = :status', { status: 'active' })
            .orderBy('message.createdAt', 'ASC')
            .limit(limit)
            .getMany();
    }
    async findByRole(sessionId, role) {
        return await this.messageRepository.find({
            where: {
                chatSessionId: sessionId,
                role,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }
    async searchInSession(sessionId, query) {
        return await this.messageRepository.find({
            where: {
                chatSessionId: sessionId,
                content: (0, typeorm_2.Like)(`%${query}%`),
            },
            order: {
                createdAt: 'DESC',
            },
            take: 100,
        });
    }
    async findByDateRange(sessionId, startDate, endDate) {
        return await this.messageRepository.find({
            where: {
                chatSessionId: sessionId,
                createdAt: (0, typeorm_2.Between)(startDate, endDate),
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }
    async countBySessionId(sessionId) {
        return await this.messageRepository.count({
            where: { chatSessionId: sessionId },
        });
    }
    async countByRole(sessionId, role) {
        return await this.messageRepository.count({
            where: {
                chatSessionId: sessionId,
                role,
            },
        });
    }
    async createMany(messagesData) {
        const messages = this.messageRepository.create(messagesData);
        return await this.messageRepository.save(messages);
    }
    async deleteBySessionId(sessionId) {
        await this.messageRepository.delete({ chatSessionId: sessionId });
    }
    async existsById(id) {
        const count = await this.messageRepository.count({
            where: { id },
        });
        return count > 0;
    }
    async belongsToSession(messageId, sessionId) {
        const count = await this.messageRepository.count({
            where: {
                id: messageId,
                chatSessionId: sessionId,
            },
        });
        return count > 0;
    }
};
exports.ChatMessageRepository = ChatMessageRepository;
exports.ChatMessageRepository = ChatMessageRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ChatMessageRepository);
//# sourceMappingURL=chat-message.repository.js.map