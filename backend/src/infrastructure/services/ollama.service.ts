import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Serviço para integração com Ollama API
 */
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaBaseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaBaseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('OLLAMA_DEFAULT_MODEL', 'llama2');
  }

  /**
   * Gera um título para a conversa baseado na primeira mensagem do usuário
   * @param firstUserMessage - Primeira mensagem do usuário
   * @returns Promise com o título gerado
   */
  async generateConversationTitle(firstUserMessage: string): Promise<string> {
    try {
      this.logger.log(`Gerando título para mensagem: ${firstUserMessage.substring(0, 50)}...`);

      const prompt = `Based on this user message, generate a short, descriptive title (maximum 4-5 words) for a conversation. Respond only with the title, no quotes, no explanation:

User message: "${firstUserMessage}"

Title:`;

      const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 50,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedTitle = data.response?.trim();

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
   * Gera uma resposta usando o Ollama API
   * @param prompt - Prompt completo incluindo contexto
   * @param options - Opções para a geração
   * @returns Promise com a resposta gerada
   */
  async generateResponse(
    prompt: string, 
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
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
      // Usa configuração dinâmica se fornecida, senão usa a configuração padrão
      const baseUrl = options.ollamaConfig?.baseUrl || this.ollamaBaseUrl;
      const timeout = options.ollamaConfig?.timeout || 300000;
      
      this.logger.log(`Gerando resposta com modelo: ${options.model || this.defaultModel}`);
      this.logger.log(`Usando Ollama URL: ${baseUrl}`);

      const requestBody = {
        model: options.model || this.defaultModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
          top_p: 0.9,
          top_k: 40,
        },
      };

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeout), // timeout dinâmico
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (!data.response) {
        throw new Error('Empty response from Ollama API');
      }

      this.logger.log(`Resposta gerada em ${processingTime}ms`);

      // Remove prefixos indesejados da resposta
      let cleanContent = data.response.trim();
      
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

      return {
        content: cleanContent,
        model: requestBody.model,
        tokens: data.eval_count || 0,
        processingTime,
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
    try {
      this.logger.log(`Generating SD prompt for: "${userMessage.substring(0, 50)}..."`);

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

      const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt: systemPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 500,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.response?.trim() || '';

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
   * @returns Promise<boolean>
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 segundo timeout
      });

      return response.ok;
    } catch (error) {
      this.logger.warn(`Ollama não está disponível: ${error.message}`);
      return false;
    }
  }

  /**
   * Lista os modelos disponíveis no Ollama
   * @returns Promise com lista de modelos
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar modelos: ${error.message}`);
      return [];
    }
  }
}
