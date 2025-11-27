"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../../domain/entities/user.entity");
const chat_session_entity_1 = require("../../domain/entities/chat-session.entity");
const chat_message_entity_1 = require("../../domain/entities/chat-message.entity");
const chat_use_case_1 = require("../../application/use-cases/chat.use-case");
const user_repository_1 = require("../../infrastructure/repositories/user.repository");
const chat_session_repository_1 = require("../../infrastructure/repositories/chat-session.repository");
const chat_message_repository_1 = require("../../infrastructure/repositories/chat-message.repository");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_module_1 = require("./auth.module");
const ollama_service_1 = require("../../infrastructure/services/ollama.service");
const stable_diffusion_service_1 = require("../../infrastructure/services/stable-diffusion.service");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, chat_session_entity_1.ChatSession, chat_message_entity_1.ChatMessage]),
            auth_module_1.AuthModule,
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [
            chat_use_case_1.ChatUseCase,
            ollama_service_1.OllamaService,
            stable_diffusion_service_1.StableDiffusionService,
            {
                provide: 'IUserRepository',
                useClass: user_repository_1.UserRepository,
            },
            {
                provide: 'IChatSessionRepository',
                useClass: chat_session_repository_1.ChatSessionRepository,
            },
            {
                provide: 'IChatMessageRepository',
                useClass: chat_message_repository_1.ChatMessageRepository,
            },
        ],
        exports: [chat_use_case_1.ChatUseCase],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map