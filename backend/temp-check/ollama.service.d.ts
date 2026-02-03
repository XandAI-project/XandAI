import { ConfigService } from '@nestjs/config';
/**
 * Serviço para integração com Ollama API
 * Supports dynamic baseUrl override from frontend configuration
 */
export declare class OllamaService {
    private readonly configService;
    private readonly logger;
    private readonly ollamaBaseUrl;
    private readonly defaultModel;
    private dynamicBaseUrl;
    private dynamicTimeout;
    constructor(configService: ConfigService);
    /**
     * Sets dynamic configuration from frontend (overrides env vars)
     * @param config - Frontend configuration
     */
    setDynamicConfig(config: {
        baseUrl?: string;
        timeout?: number;
    }): void;
    /**
     * Gets the effective base URL (frontend config takes priority)
     */
    private getEffectiveBaseUrl;
    /**
     * Gera um título para a conversa baseado na primeira mensagem do usuário
     * @param firstUserMessage - Primeira mensagem do usuário
     * @returns Promise com o título gerado
     */
    generateConversationTitle(firstUserMessage: string): Promise<string>;
    /**
     * Gera um título de fallback quando a API do Ollama falha
     * @param message - Mensagem do usuário
     * @returns Título de fallback
     */
    private generateFallbackTitle;
    /**
     * Limpa e formata o título gerado
     * @param title - Título bruto
     * @returns Título limpo
     */
    private cleanTitle;
    /**
     * Gera uma resposta com streaming usando o Ollama API
     * @param prompt - Prompt completo incluindo contexto
     * @param options - Opções para a geração
     * @param onToken - Callback chamado para cada token recebido
     * @returns Promise com a resposta completa
     */
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
    /**
     * Gera uma resposta usando o Ollama API
     * @param prompt - Prompt completo incluindo contexto
     * @param options - Opções para a geração
     * @returns Promise com a resposta gerada
     */
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
    /**
     * Detects if the user message is requesting image generation
     * @param message - User message
     * @returns boolean indicating if it's an image generation request
     */
    isImageGenerationRequest(message: string): boolean;
    /**
     * Generates an optimized Stable Diffusion prompt from user request
     * @param userMessage - User's image request
     * @returns Promise with the optimized SD prompt
     */
    generateImagePrompt(userMessage: string): Promise<{
        prompt: string;
        negativePrompt: string;
        style?: string;
    }>;
    /**
     * Generates a basic fallback prompt when AI generation fails
     */
    private generateFallbackImagePrompt;
    /**
     * Verifica se o serviço Ollama está disponível
     * @param customBaseUrl - Optional custom URL to check
     * @returns Promise<boolean>
     */
    isAvailable(customBaseUrl?: string): Promise<boolean>;
    /**
     * Lista os modelos disponíveis no Ollama
     * @param customBaseUrl - Optional custom URL to query
     * @returns Promise com lista de modelos
     */
    getAvailableModels(customBaseUrl?: string): Promise<string[]>;
}
