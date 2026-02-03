import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Serviço para integração com Ollama API
 * Supports dynamic baseUrl override from frontend configuration
 */
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaBaseUrl: string;
  private readonly defaultModel: string;
  
  // Store dynamic config for use across methods
  private dynamicBaseUrl: string | null = null;
  private dynamicTimeout: number | null = null;

  constructor(private readonly configService: ConfigService) {
    this.ollamaBaseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('OLLAMA_DEFAULT_MODEL', 'llama2');
  }

  /**
   * Sets dynamic configuration from frontend (overrides env vars)
   * @param config - Frontend configuration
   */
  setDynamicConfig(config: { baseUrl?: string; timeout?: number }) {
    if (config.baseUrl) {
      this.dynamicBaseUrl = config.baseUrl;
      this.logger.log(`🔗 Dynamic Ollama URL set from frontend: ${config.baseUrl}`);
    }
    if (config.timeout) {
      this.dynamicTimeout = config.timeout;
    }
  }

  /**
   * Gets the effective base URL (frontend config takes priority)
   */
  private getEffectiveBaseUrl(overrideUrl?: string): string {
    // Priority: 1. Method parameter, 2. Dynamic config from frontend, 3. Env var
    const effectiveUrl = overrideUrl || this.dynamicBaseUrl || this.ollamaBaseUrl;
    return effectiveUrl;
  }

  /**
   * Gera um título para a conversa baseado na primeira mensagem do usuário
   * @param firstUserMessage - Primeira mensagem do usuário
   * @returns Promise com o título gerado
   */
  async generateConversationTitle(firstUserMessage: string): Promise<string> {
    const baseUrl = this.getEffectiveBaseUrl();
    
    try {
      this.logger.log(`📝 Generating title for message: "${firstUserMessage.substring(0, 50)}..."`);
      this.logger.log(`📝 Using model: ${this.defaultModel}`);
      this.logger.log(`📝 Ollama URL: ${baseUrl}`);

      const prompt = `Based on this user message, generate a short, descriptive title (maximum 4-5 words) for a conversation. Respond only with the title, no quotes, no explanation:

User message: "${firstUserMessage}"

Title:`;

      // Try /api/chat first, fallback to /api/generate
      let response: Response;
      let data: any;

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
        } else {
          throw new Error('Chat endpoint failed');
        }
      } catch {
        // Fallback to /api/generate
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

      // Limpa o título (remove aspas, quebras de linha, etc.)
      const cleanTitle = this.cleanTitle(generatedTitle);
      
      this.logger.log(`Título gerado: "${cleanTitle}"`);
      return cleanTitle;

    } catch (error) {
      this.logger.error(`Erro ao gerar título: ${error.message}`);
      // Fallback: gera título baseado na mensagem
      return this.generateFallbackTitle(firstUserMessage);
    }
  }

  /**
   * Gera um título de fallback quando a API do Ollama falha
   * @param message - Mensagem do usuário
   * @returns Título de fallback
   */
  private generateFallbackTitle(message: string): string {
    // Remove caracteres especiais e pega as primeiras palavras
    const words = message
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 4);

    if (words.length === 0) {
      return 'Nova Conversa';
    }

    let title = words.join(' ');
    
    // Limita o tamanho
    if (title.length > 30) {
      title = title.substring(0, 27) + '...';
    }

    // Capitaliza a primeira letra
    title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();

    return title;
  }

  /**
   * Limpa e formata o título gerado
   * @param title - Título bruto
   * @returns Título limpo
   */
  private cleanTitle(title: string): string {
    let cleaned = title
      .replace(/['"]/g, '') // Remove aspas
      .replace(/\n/g, ' ') // Substitui quebras de linha por espaços
      .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um só
      .trim();

    // Limita o tamanho
    if (cleaned.length > 40) {
      cleaned = cleaned.substring(0, 37) + '...';
    }

    // Se estiver vazio, usa fallback
    if (!cleaned) {
      cleaned = 'Nova Conversa';
    }

    return cleaned;
  }

  /**
   * Gera uma resposta com streaming usando o Ollama API
   * @param messages - Array de mensagens no formato Ollama (ou string para compatibilidade)
   * @param options - Opções para a geração
   * @param onToken - Callback chamado para cada token recebido
   * @returns Promise com a resposta completa
   */
  async generateResponseWithStreaming(
    messages: Array<{ role: string; content: string }> | string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topK?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      repeatPenalty?: number;
      seed?: number;
      ollamaConfig?: {
        baseUrl?: string;
        timeout?: number;
        enabled?: boolean;
      };
    } = {},
    onToken: (token: string, fullText: string) => void
  ): Promise<{ content: string; model: string; tokens: number; processingTime: number }> {
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
      
      // Convert string to messages array for compatibility
      const messagesArray = typeof messages === 'string' 
        ? [{ role: 'user', content: messages }]
        : messages;
      this.logger.log(`🌊 ========== OLLAMA STREAMING REQUEST ==========`);
      this.logger.log(`🤖 Model: ${model}`);
      this.logger.log(`🔗 URL: ${baseUrl}`);
      this.logger.log(`===============================================`);

      const chatRequestBody = {
        model: model,
        messages: messagesArray,
        stream: true, // Enable streaming
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 2048,
          ...(options.topK && { top_k: options.topK }),
          ...(options.topP && { top_p: options.topP }),
          ...(options.frequencyPenalty && { frequency_penalty: options.frequencyPenalty }),
          ...(options.presencePenalty && { presence_penalty: options.presencePenalty }),
          ...(options.repeatPenalty && { repeat_penalty: options.repeatPenalty }),
          ...(options.seed !== undefined && { seed: options.seed }),
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

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const tokensPerSecond = processingTime > 0 ? (totalTokens / (processingTime / 1000)).toFixed(2) : '0';
      this.logger.log(`✅ Streaming completed in ${processingTime}ms, ${totalTokens} tokens (${tokensPerSecond} tokens/s)`);

      return {
        content: fullContent,
        model: model,
        tokens: totalTokens,
        processingTime,
        tokensPerSecond: parseFloat(tokensPerSecond),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Streaming error: ${error.message} (${processingTime}ms)`);
      throw error;
    }
  }

  /**
   * Gera uma resposta usando o Ollama API
   * @param messages - Array de mensagens no formato Ollama (ou string para compatibilidade)
   * @param options - Opções para a geração
   * @returns Promise com a resposta gerada
   */
  async generateResponse(
    messages: Array<{ role: string; content: string }> | string, 
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topK?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      repeatPenalty?: number;
      seed?: number;
      ollamaConfig?: {
        baseUrl?: string;
        timeout?: number;
        enabled?: boolean;
      };
      [key: string]: any;
    } = {}
  ): Promise<{
    content: string;
    model: string;
    tokens: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // If frontend sent a config, store it for other methods (like title generation)
      if (options.ollamaConfig?.baseUrl) {
        this.setDynamicConfig({
          baseUrl: options.ollamaConfig.baseUrl,
          timeout: options.ollamaConfig.timeout
        });
      }
      
      // Get effective URL (priority: options > dynamic > env)
      const baseUrl = this.getEffectiveBaseUrl(options.ollamaConfig?.baseUrl);
      const timeout = options.ollamaConfig?.timeout || this.dynamicTimeout || 300000;
      const model = options.model || this.defaultModel;
      
      // Convert string to messages array for compatibility
      const messagesArray = typeof messages === 'string' 
        ? [{ role: 'user', content: messages }]
        : messages;
      this.logger.log(`🤖 ========== OLLAMA REQUEST ==========`);
      this.logger.log(`🤖 Model requested: ${options.model || '(not specified)'}`);
      this.logger.log(`🤖 Default model: ${this.defaultModel}`);
      this.logger.log(`🤖 Model being used: ${model}`);
      this.logger.log(`🔗 Ollama URL: ${baseUrl}${options.ollamaConfig?.baseUrl ? ' (from frontend)' : this.dynamicBaseUrl ? ' (from dynamic config)' : ' (from env)'}`);
      this.logger.log(`⏱️ Timeout: ${timeout}ms`);
      this.logger.log(`🌡️ Temperature: ${options.temperature || 0.7}`);
      this.logger.log(`======================================`);

      // Try /api/chat first (for chat models like llama3.2), fallback to /api/generate
      let response: Response;
      let data: any;
      let usedEndpoint: string;

      // First try /api/chat (preferred for chat models)
      try {
        const chatRequestBody = {
          model: model,
          messages: messagesArray,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048,
            ...(options.topK && { top_k: options.topK }),
            ...(options.topP && { top_p: options.topP }),
            ...(options.frequencyPenalty && { frequency_penalty: options.frequencyPenalty }),
            ...(options.presencePenalty && { presence_penalty: options.presencePenalty }),
            ...(options.repeatPenalty && { repeat_penalty: options.repeatPenalty }),
            ...(options.seed !== undefined && { seed: options.seed }),
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
        } else {
          throw new Error(`Chat endpoint failed: ${response.status}`);
        }
      } catch (chatError) {
        // Fallback to /api/generate
        this.logger.log(`⚠️ /api/chat failed, falling back to /api/generate with model: ${model}...`);
        
        // Convert messages array to single prompt string for /api/generate
        const promptString = messagesArray
          .map(msg => `${msg.role === 'system' ? 'System: ' : msg.role === 'user' ? 'User: ' : 'Assistant: '}${msg.content}`)
          .join('\n\n');
        
        const generateRequestBody = {
          model: model,
          prompt: promptString,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048,
            ...(options.topK && { top_k: options.topK }),
            ...(options.topP && { top_p: options.topP }),
            ...(options.frequencyPenalty && { frequency_penalty: options.frequencyPenalty }),
            ...(options.presencePenalty && { presence_penalty: options.presencePenalty }),
            ...(options.repeatPenalty && { repeat_penalty: options.repeatPenalty }),
            ...(options.seed !== undefined && { seed: options.seed }),
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

      // Extract content based on endpoint used
      let content: string;
      if (usedEndpoint === '/api/chat') {
        content = data.message?.content || data.response || '';
      } else {
        content = data.response || '';
      }

      if (!content) {
        throw new Error('Empty response from Ollama API');
      }

      this.logger.log(`✅ Response generated via ${usedEndpoint} in ${processingTime}ms using model: ${model}`);

      // Remove prefixos indesejados da resposta
      let cleanContent = content.trim();
      
      // Remove prefixos comuns que o modelo pode adicionar
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

      const tokens = data.eval_count || data.prompt_eval_count || 0;
      const tokensPerSecond = processingTime > 0 ? parseFloat((tokens / (processingTime / 1000)).toFixed(2)) : 0;
      
      this.logger.log(`📊 Tokens: ${tokens}, Time: ${processingTime}ms, Speed: ${tokensPerSecond} tokens/s`);

      return {
        content: cleanContent,
        model: model,
        tokens,
        processingTime,
        tokensPerSecond,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Erro ao gerar resposta: ${error.message} (${processingTime}ms)`);
      throw error;
    }
  }

  /**
   * Detects if the user message is requesting image generation
   * @param message - User message
   * @returns boolean indicating if it's an image generation request
   */
  isImageGenerationRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Image generation trigger phrases (multiple languages)
    const imagePatterns = [
      // English
      /\b(generate|create|make|draw|produce|render|design)\b.*(image|picture|photo|illustration|artwork|art|drawing|painting|visual)/i,
      /\b(image|picture|photo|illustration|artwork|art|drawing|painting)\b.*(of|for|showing|depicting|with)/i,
      /\b(show me|give me|i want|i need|can you make|can you create|can you draw|can you generate)\b.*(image|picture|photo|illustration|artwork|art|drawing)/i,
      /\bvisualize\b/i,
      /\billustrate\b/i,
      // Portuguese
      /\b(gere|crie|faça|desenhe|produza|renderize)\b.*(imagem|foto|ilustração|arte|desenho|pintura|visual)/i,
      /\b(imagem|foto|ilustração|arte|desenho|pintura)\b.*(de|para|mostrando|com)/i,
      /\b(me mostre|me dê|eu quero|eu preciso|pode criar|pode fazer|pode desenhar|pode gerar)\b.*(imagem|foto|ilustração|arte|desenho)/i,
      /\bvisualize\b/i,
      /\bilustre\b/i,
      // Spanish
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

  /**
   * Generates an optimized Stable Diffusion prompt from user request
   * @param userMessage - User's image request
   * @returns Promise with the optimized SD prompt
   */
  async generateImagePrompt(userMessage: string): Promise<{
    prompt: string;
    negativePrompt: string;
    style?: string;
  }> {
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

      // Try /api/chat first, fallback to /api/generate
      let response: Response;
      let data: any;

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
        } else {
          throw new Error('Chat endpoint failed');
        }
      } catch {
        // Fallback to /api/generate
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

      // Try to parse JSON from response
      try {
        // Extract JSON from response (it might have extra text)
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
      } catch (parseError) {
        this.logger.warn(`Failed to parse JSON response: ${parseError.message}`);
      }

      // Fallback if parsing fails
      return {
        prompt: this.generateFallbackImagePrompt(userMessage),
        negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature',
      };

    } catch (error) {
      this.logger.error(`Error generating image prompt: ${error.message}`);
      return {
        prompt: this.generateFallbackImagePrompt(userMessage),
        negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature',
      };
    }
  }

  /**
   * Generates a basic fallback prompt when AI generation fails
   */
  private generateFallbackImagePrompt(userMessage: string): string {
    // Extract key subject from message
    const cleanMessage = userMessage
      .toLowerCase()
      .replace(/\b(generate|create|make|draw|produce|render|design|gere|crie|faça|desenhe|image|picture|photo|illustration|imagem|foto|ilustração|a|an|the|um|uma|o|a|of|de|for|para|me|i want|eu quero|can you|pode)\b/gi, '')
      .trim();

    return `${cleanMessage}, highly detailed, masterpiece, best quality, professional, 8k uhd, sharp focus, vibrant colors`;
  }

  /**
   * Verifica se o serviço Ollama está disponível
   * @param customBaseUrl - Optional custom URL to check
   * @returns Promise<boolean>
   */
  async isAvailable(customBaseUrl?: string): Promise<boolean> {
    const baseUrl = this.getEffectiveBaseUrl(customBaseUrl);
    
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 segundo timeout
      });

      return response.ok;
    } catch (error) {
      this.logger.warn(`Ollama não está disponível em ${baseUrl}: ${error.message}`);
      return false;
    }
  }

  /**
   * Lista os modelos disponíveis no Ollama
   * @param customBaseUrl - Optional custom URL to query
   * @returns Promise com lista de modelos
   */
  async getAvailableModels(customBaseUrl?: string): Promise<string[]> {
    const baseUrl = this.getEffectiveBaseUrl(customBaseUrl);
    
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar modelos em ${baseUrl}: ${error.message}`);
      return [];
    }
  }
}
