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
var OllamaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let OllamaService = OllamaService_1 = class OllamaService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(OllamaService_1.name);
        this.dynamicBaseUrl = null;
        this.dynamicTimeout = null;
        this.ollamaBaseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434');
        this.defaultModel = this.configService.get('OLLAMA_DEFAULT_MODEL', 'llama2');
    }
    setDynamicConfig(config) {
        if (config.baseUrl) {
            this.dynamicBaseUrl = config.baseUrl;
            this.logger.log(`🔗 Dynamic Ollama URL set from frontend: ${config.baseUrl}`);
        }
        if (config.timeout) {
            this.dynamicTimeout = config.timeout;
        }
    }
    getEffectiveBaseUrl(overrideUrl) {
        const effectiveUrl = overrideUrl || this.dynamicBaseUrl || this.ollamaBaseUrl;
        return effectiveUrl;
    }
    async generateConversationTitle(firstUserMessage) {
        const baseUrl = this.getEffectiveBaseUrl();
        try {
            this.logger.log(`📝 Generating title for message: "${firstUserMessage.substring(0, 50)}..."`);
            this.logger.log(`📝 Using model: ${this.defaultModel}`);
            this.logger.log(`📝 Ollama URL: ${baseUrl}`);
            const prompt = `Based on this user message, generate a short, descriptive title (maximum 4-5 words) for a conversation. Respond only with the title, no quotes, no explanation:

User message: "${firstUserMessage}"

Title:`;
            let response;
            let data;
            try {
                response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.defaultModel,
                        messages: [{ role: 'user', content: prompt }],
                        stream: false,
                        options: { temperature: 0.7, num_predict: 50 },
                    }),
                    signal: AbortSignal.timeout(30000),
                });
                if (response.ok) {
                    data = await response.json();
                }
                else {
                    throw new Error('Chat endpoint failed');
                }
            }
            catch {
                response = await fetch(`${baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.defaultModel,
                        prompt: prompt,
                        stream: false,
                        options: { temperature: 0.7, num_predict: 50 },
                    }),
                    signal: AbortSignal.timeout(30000),
                });
                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.status}`);
                }
                data = await response.json();
            }
            const generatedTitle = data.message?.content?.trim() || data.response?.trim();
            if (!generatedTitle) {
                throw new Error('Empty response from Ollama');
            }
            const cleanTitle = this.cleanTitle(generatedTitle);
            this.logger.log(`Título gerado: "${cleanTitle}"`);
            return cleanTitle;
        }
        catch (error) {
            this.logger.error(`Erro ao gerar título: ${error.message}`);
            return this.generateFallbackTitle(firstUserMessage);
        }
    }
    generateFallbackTitle(message) {
        const words = message
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(word => word.length > 0)
            .slice(0, 4);
        if (words.length === 0) {
            return 'Nova Conversa';
        }
        let title = words.join(' ');
        if (title.length > 30) {
            title = title.substring(0, 27) + '...';
        }
        title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
        return title;
    }
    cleanTitle(title) {
        let cleaned = title
            .replace(/['"]/g, '')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned.length > 40) {
            cleaned = cleaned.substring(0, 37) + '...';
        }
        if (!cleaned) {
            cleaned = 'Nova Conversa';
        }
        return cleaned;
    }
    async generateResponseWithStreaming(prompt, options = {}, onToken) {
        const startTime = Date.now();
        try {
            if (options.ollamaConfig?.baseUrl) {
                this.setDynamicConfig({
                    baseUrl: options.ollamaConfig.baseUrl,
                    timeout: options.ollamaConfig.timeout
                });
            }
            const baseUrl = this.getEffectiveBaseUrl(options.ollamaConfig?.baseUrl);
            const timeout = options.ollamaConfig?.timeout || this.dynamicTimeout || 300000;
            const model = options.model || this.defaultModel;
            this.logger.log(`🌊 ========== OLLAMA STREAMING REQUEST ==========`);
            this.logger.log(`🤖 Model: ${model}`);
            this.logger.log(`🔗 URL: ${baseUrl}`);
            this.logger.log(`===============================================`);
            const chatRequestBody = {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                options: {
                    temperature: options.temperature || 0.7,
                    num_predict: options.maxTokens || 2048,
                },
            };
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatRequestBody),
                signal: AbortSignal.timeout(timeout),
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }
            const decoder = new TextDecoder();
            let fullContent = '';
            let totalTokens = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            fullContent += data.message.content;
                            totalTokens++;
                            onToken(data.message.content, fullContent);
                        }
                        if (data.done) {
                            totalTokens = data.eval_count || totalTokens;
                        }
                    }
                    catch {
                    }
                }
            }
            const processingTime = Date.now() - startTime;
            this.logger.log(`✅ Streaming completed in ${processingTime}ms, ${totalTokens} tokens`);
            return {
                content: fullContent,
                model: model,
                tokens: totalTokens,
                processingTime,
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`Streaming error: ${error.message} (${processingTime}ms)`);
            throw error;
        }
    }
    async generateResponse(prompt, options = {}) {
        const startTime = Date.now();
        try {
            if (options.ollamaConfig?.baseUrl) {
                this.setDynamicConfig({
                    baseUrl: options.ollamaConfig.baseUrl,
                    timeout: options.ollamaConfig.timeout
                });
            }
            const baseUrl = this.getEffectiveBaseUrl(options.ollamaConfig?.baseUrl);
            const timeout = options.ollamaConfig?.timeout || this.dynamicTimeout || 300000;
            const model = options.model || this.defaultModel;
            this.logger.log(`🤖 ========== OLLAMA REQUEST ==========`);
            this.logger.log(`🤖 Model requested: ${options.model || '(not specified)'}`);
            this.logger.log(`🤖 Default model: ${this.defaultModel}`);
            this.logger.log(`🤖 Model being used: ${model}`);
            this.logger.log(`🔗 Ollama URL: ${baseUrl}${options.ollamaConfig?.baseUrl ? ' (from frontend)' : this.dynamicBaseUrl ? ' (from dynamic config)' : ' (from env)'}`);
            this.logger.log(`⏱️ Timeout: ${timeout}ms`);
            this.logger.log(`🌡️ Temperature: ${options.temperature || 0.7}`);
            this.logger.log(`======================================`);
            let response;
            let data;
            let usedEndpoint;
            try {
                const chatRequestBody = {
                    model: model,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    stream: false,
                    options: {
                        temperature: options.temperature || 0.7,
                        num_predict: options.maxTokens || 2048,
                        top_p: 0.9,
                        top_k: 40,
                    },
                };
                this.logger.log(`🔄 Trying /api/chat with model: ${model}...`);
                response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(chatRequestBody),
                    signal: AbortSignal.timeout(timeout),
                });
                if (response.ok) {
                    data = await response.json();
                    usedEndpoint = '/api/chat';
                }
                else {
                    throw new Error(`Chat endpoint failed: ${response.status}`);
                }
            }
            catch (chatError) {
                this.logger.log(`⚠️ /api/chat failed, falling back to /api/generate with model: ${model}...`);
                const generateRequestBody = {
                    model: model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: options.temperature || 0.7,
                        num_predict: options.maxTokens || 2048,
                        top_p: 0.9,
                        top_k: 40,
                    },
                };
                response = await fetch(`${baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(generateRequestBody),
                    signal: AbortSignal.timeout(timeout),
                });
                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
                }
                data = await response.json();
                usedEndpoint = '/api/generate';
            }
            const processingTime = Date.now() - startTime;
            let content;
            if (usedEndpoint === '/api/chat') {
                content = data.message?.content || data.response || '';
            }
            else {
                content = data.response || '';
            }
            if (!content) {
                throw new Error('Empty response from Ollama API');
            }
            this.logger.log(`✅ Response generated via ${usedEndpoint} in ${processingTime}ms using model: ${model}`);
            let cleanContent = content.trim();
            const prefixesToRemove = [
                'Assistente:', 'Assistant:', 'Resposta:', 'Response:',
                'AI:', 'IA:', 'Bot:', 'Chatbot:', 'Sistema:'
            ];
            for (const prefix of prefixesToRemove) {
                if (cleanContent.startsWith(prefix)) {
                    cleanContent = cleanContent.substring(prefix.length).trim();
                    this.logger.log(`Removido prefixo: ${prefix}`);
                    break;
                }
            }
            return {
                content: cleanContent,
                model: model,
                tokens: data.eval_count || data.prompt_eval_count || 0,
                processingTime,
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`Erro ao gerar resposta: ${error.message} (${processingTime}ms)`);
            throw error;
        }
    }
    isImageGenerationRequest(message) {
        const lowerMessage = message.toLowerCase();
        const imagePatterns = [
            /\b(generate|create|make|draw|produce|render|design)\b.*(image|picture|photo|illustration|artwork|art|drawing|painting|visual)/i,
            /\b(image|picture|photo|illustration|artwork|art|drawing|painting)\b.*(of|for|showing|depicting|with)/i,
            /\b(show me|give me|i want|i need|can you make|can you create|can you draw|can you generate)\b.*(image|picture|photo|illustration|artwork|art|drawing)/i,
            /\bvisualize\b/i,
            /\billustrate\b/i,
            /\b(gere|crie|faça|desenhe|produza|renderize)\b.*(imagem|foto|ilustração|arte|desenho|pintura|visual)/i,
            /\b(imagem|foto|ilustração|arte|desenho|pintura)\b.*(de|para|mostrando|com)/i,
            /\b(me mostre|me dê|eu quero|eu preciso|pode criar|pode fazer|pode desenhar|pode gerar)\b.*(imagem|foto|ilustração|arte|desenho)/i,
            /\bvisualize\b/i,
            /\bilustre\b/i,
            /\b(genera|crea|haz|dibuja|produce)\b.*(imagen|foto|ilustración|arte|dibujo|pintura)/i,
            /\b(imagen|foto|ilustración|arte|dibujo)\b.*(de|para|mostrando|con)/i,
        ];
        for (const pattern of imagePatterns) {
            if (pattern.test(lowerMessage)) {
                this.logger.log(`Image generation request detected: "${message.substring(0, 50)}..."`);
                return true;
            }
        }
        return false;
    }
    async generateImagePrompt(userMessage) {
        const baseUrl = this.getEffectiveBaseUrl();
        try {
            this.logger.log(`🎨 Generating SD prompt for: "${userMessage.substring(0, 50)}..."`);
            this.logger.log(`🎨 Using model: ${this.defaultModel}`);
            this.logger.log(`🎨 Ollama URL: ${baseUrl}`);
            const systemPrompt = `You are an expert prompt engineer for Stable Diffusion image generation. 
Your task is to convert user requests into highly detailed, optimized prompts for SDXL.

RULES:
1. Output ONLY a JSON object with "prompt" and "negativePrompt" fields
2. The prompt should be detailed, descriptive, and include:
   - Subject description
   - Art style (photorealistic, digital art, oil painting, anime, etc.)
   - Lighting (studio lighting, natural light, dramatic lighting, etc.)
   - Quality boosters (masterpiece, best quality, highly detailed, 8k, etc.)
   - Camera/composition details if relevant
3. The negative prompt should include common quality issues to avoid
4. Do NOT include any explanation, just the JSON

EXAMPLE OUTPUT:
{"prompt": "a majestic golden retriever dog sitting in a sunlit meadow, photorealistic, professional photography, golden hour lighting, bokeh background, sharp focus, highly detailed fur texture, masterpiece, best quality, 8k uhd", "negativePrompt": "blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature"}

User request: "${userMessage}"

JSON:`;
            let response;
            let data;
            try {
                response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.defaultModel,
                        messages: [{ role: 'user', content: systemPrompt }],
                        stream: false,
                        options: { temperature: 0.7, num_predict: 500 },
                    }),
                    signal: AbortSignal.timeout(30000),
                });
                if (response.ok) {
                    data = await response.json();
                }
                else {
                    throw new Error('Chat endpoint failed');
                }
            }
            catch {
                response = await fetch(`${baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.defaultModel,
                        prompt: systemPrompt,
                        stream: false,
                        options: { temperature: 0.7, num_predict: 500 },
                    }),
                    signal: AbortSignal.timeout(30000),
                });
                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.status}`);
                }
                data = await response.json();
            }
            let responseText = data.message?.content?.trim() || data.response?.trim() || '';
            try {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    this.logger.log(`Generated SD prompt: "${parsed.prompt?.substring(0, 50)}..."`);
                    return {
                        prompt: parsed.prompt || this.generateFallbackImagePrompt(userMessage),
                        negativePrompt: parsed.negativePrompt || 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text',
                        style: parsed.style,
                    };
                }
            }
            catch (parseError) {
                this.logger.warn(`Failed to parse JSON response: ${parseError.message}`);
            }
            return {
                prompt: this.generateFallbackImagePrompt(userMessage),
                negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature',
            };
        }
        catch (error) {
            this.logger.error(`Error generating image prompt: ${error.message}`);
            return {
                prompt: this.generateFallbackImagePrompt(userMessage),
                negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature',
            };
        }
    }
    generateFallbackImagePrompt(userMessage) {
        const cleanMessage = userMessage
            .toLowerCase()
            .replace(/\b(generate|create|make|draw|produce|render|design|gere|crie|faça|desenhe|image|picture|photo|illustration|imagem|foto|ilustração|a|an|the|um|uma|o|a|of|de|for|para|me|i want|eu quero|can you|pode)\b/gi, '')
            .trim();
        return `${cleanMessage}, highly detailed, masterpiece, best quality, professional, 8k uhd, sharp focus, vibrant colors`;
    }
    async isAvailable(customBaseUrl) {
        const baseUrl = this.getEffectiveBaseUrl(customBaseUrl);
        try {
            const response = await fetch(`${baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        }
        catch (error) {
            this.logger.warn(`Ollama não está disponível em ${baseUrl}: ${error.message}`);
            return false;
        }
    }
    async getAvailableModels(customBaseUrl) {
        const baseUrl = this.getEffectiveBaseUrl(customBaseUrl);
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data = await response.json();
            return data.models?.map((model) => model.name) || [];
        }
        catch (error) {
            this.logger.error(`Erro ao buscar modelos em ${baseUrl}: ${error.message}`);
            return [];
        }
    }
};
exports.OllamaService = OllamaService;
exports.OllamaService = OllamaService = OllamaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OllamaService);
//# sourceMappingURL=ollama.service.js.map