import { ConfigService } from '@nestjs/config';
export declare class OllamaService {
    private readonly configService;
    private readonly logger;
    private readonly ollamaBaseUrl;
    private readonly defaultModel;
    private dynamicBaseUrl;
    private dynamicTimeout;
    constructor(configService: ConfigService);
    setDynamicConfig(config: {
        baseUrl?: string;
        timeout?: number;
    }): void;
    private getEffectiveBaseUrl;
    generateConversationTitle(firstUserMessage: string): Promise<string>;
    private generateFallbackTitle;
    private cleanTitle;
    generateResponseWithStreaming(prompt: string, options: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        ollamaConfig?: {
            baseUrl?: string;
            timeout?: number;
            enabled?: boolean;
        };
    }, onToken: (token: string, fullText: string) => void): Promise<{
        content: string;
        model: string;
        tokens: number;
        processingTime: number;
    }>;
    generateResponse(prompt: string, options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        ollamaConfig?: {
            baseUrl?: string;
            timeout?: number;
            enabled?: boolean;
        };
        [key: string]: any;
    }): Promise<{
        content: string;
        model: string;
        tokens: number;
        processingTime: number;
    }>;
    isImageGenerationRequest(message: string): boolean;
    generateImagePrompt(userMessage: string): Promise<{
        prompt: string;
        negativePrompt: string;
        style?: string;
    }>;
    private generateFallbackImagePrompt;
    isAvailable(customBaseUrl?: string): Promise<boolean>;
    getAvailableModels(customBaseUrl?: string): Promise<string[]>;
}
