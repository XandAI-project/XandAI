import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface StableDiffusionConfig {
  baseUrl: string;
  model?: string;
  steps?: number;
  width?: number;
  height?: number;
  cfgScale?: number;
  sampler?: string;
  enabled?: boolean;
  token?: string;
}

export interface GenerateImageDto {
  prompt: string;
  negativePrompt?: string;
  config?: StableDiffusionConfig;
}

export interface GeneratedImageResult {
  success: boolean;
  imagePath?: string;
  imageUrl?: string;
  filename?: string;
  error?: string;
  metadata?: any;
}

/**
 * Serviço para integração com Stable Diffusion API (Forge/Automatic1111)
 */
@Injectable()
export class StableDiffusionService implements OnModuleInit {
  private readonly logger = new Logger(StableDiffusionService.name);
  private readonly defaultBaseUrl: string;
  private readonly imagesDir: string;
  private readonly sdEnabled: boolean;
  private readonly sdApiUser: string;
  private readonly sdApiPassword: string;
  private readonly sdDefaultModel: string;
  private isForgeAvailable: boolean = false;

  constructor(private readonly configService: ConfigService) {
    // Read SD configuration from environment
    this.sdEnabled = this.configService.get<string>('SD_ENABLED', 'false') === 'true';
    this.defaultBaseUrl = this.configService.get<string>('SD_BASE_URL', 'http://localhost:7685');
    this.sdApiUser = this.configService.get<string>('SD_API_USER', '');
    this.sdApiPassword = this.configService.get<string>('SD_API_PASSWORD', '');
    this.sdDefaultModel = this.configService.get<string>('SD_DEFAULT_MODEL', 'sd_xl_base_1.0.safetensors');
    
    // Configurar diretório de imagens
    this.imagesDir = path.join(process.cwd(), 'public', 'images');
    this.ensureImagesDirExists();
  }

  /**
   * Check if Forge is available on module initialization
   */
  async onModuleInit() {
    if (this.sdEnabled) {
      this.logger.log('🎨 Stable Diffusion auto-configuration enabled');
      this.logger.log(`   Base URL: ${this.defaultBaseUrl}`);
      
      // Check connection on startup
      await this.checkForgeConnection();
    }
  }

  /**
   * Check if Forge is available and ready
   */
  private async checkForgeConnection(): Promise<void> {
    try {
      const result = await this.testConnection(this.defaultBaseUrl, this.getBasicAuthToken());
      this.isForgeAvailable = result.success;
      
      if (result.success) {
        this.logger.log('✅ Forge connection established successfully');
        
        // List available models
        const models = await this.getAvailableModels(this.defaultBaseUrl, this.getBasicAuthToken());
        if (models.length > 0) {
          this.logger.log(`   Available models: ${models.map(m => m.model_name).join(', ')}`);
        }
      } else {
        this.logger.warn(`⚠️ Forge not available: ${result.message}`);
        this.logger.warn('   Image generation will be disabled until Forge is ready');
      }
    } catch (error) {
      this.logger.warn(`⚠️ Could not connect to Forge: ${error.message}`);
      this.isForgeAvailable = false;
    }
  }

  /**
   * Get basic auth token for Forge API
   */
  private getBasicAuthToken(): string | null {
    if (this.sdApiUser && this.sdApiPassword) {
      const credentials = Buffer.from(`${this.sdApiUser}:${this.sdApiPassword}`).toString('base64');
      return `Basic ${credentials}`;
    }
    return null;
  }

  /**
   * Build auth headers for requests
   */
  private getAuthHeaders(customToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Use custom token (Bearer) if provided, otherwise use basic auth
    if (customToken) {
      headers['Authorization'] = `Bearer ${customToken}`;
    } else {
      const basicAuth = this.getBasicAuthToken();
      if (basicAuth) {
        headers['Authorization'] = basicAuth;
      }
    }

    return headers;
  }

  /**
   * Garante que o diretório de imagens existe
   */
  private ensureImagesDirExists(): void {
    try {
      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
        this.logger.log(`Diretório de imagens criado: ${this.imagesDir}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao criar diretório de imagens: ${error.message}`);
    }
  }

  /**
   * Get current configuration status
   */
  getConfigStatus(): { enabled: boolean; available: boolean; baseUrl: string; defaultModel: string } {
    return {
      enabled: this.sdEnabled,
      available: this.isForgeAvailable,
      baseUrl: this.defaultBaseUrl,
      defaultModel: this.sdDefaultModel,
    };
  }

  /**
   * Testa a conexão com o Stable Diffusion
   */
  async testConnection(baseUrl?: string, sdToken?: string): Promise<{ success: boolean; message: string; version?: string }> {
    const url = baseUrl || this.defaultBaseUrl;
    
    try {
      this.logger.log(`Testando conexão com SD: ${url}`);

      const headers = this.getAuthHeaders(sdToken);

      // Try the models endpoint first (more reliable)
      const response = await fetch(`${url}/sdapi/v1/sd-models`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10 segundos
      });

      if (response.ok) {
        this.isForgeAvailable = true;
        return {
          success: true,
          message: 'Conexão estabelecida com sucesso',
          version: 'API disponível'
        };
      }

      // If models endpoint fails, try docs
      const docsResponse = await fetch(`${url}/docs`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (!docsResponse.ok) {
        throw new Error(`HTTP ${docsResponse.status}: ${docsResponse.statusText}`);
      }

      this.isForgeAvailable = true;
      return {
        success: true,
        message: 'Conexão estabelecida com sucesso',
        version: 'API disponível'
      };
    } catch (error) {
      this.logger.error(`Erro ao testar conexão SD: ${error.message}`);
      this.isForgeAvailable = false;
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Obtém modelos disponíveis
   */
  async getAvailableModels(baseUrl?: string, sdToken?: string): Promise<any[]> {
    const url = baseUrl || this.defaultBaseUrl;
    
    try {
      const headers = this.getAuthHeaders(sdToken);

      const response = await fetch(`${url}/sdapi/v1/sd-models`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar modelos: ${response.status}`);
      }

      const models = await response.json();
      this.logger.log(`Encontrados ${models.length} modelos SD`);
      
      return models.map(model => ({
        title: model.title,
        model_name: model.model_name,
        filename: model.filename
      }));
    } catch (error) {
      this.logger.error(`Erro ao buscar modelos SD: ${error.message}`);
      return [];
    }
  }

  /**
   * Gera uma imagem usando Stable Diffusion
   */
  async generateImage(generateDto: GenerateImageDto): Promise<GeneratedImageResult> {
    const startTime = Date.now();
    
    try {
      const config = generateDto.config || {} as StableDiffusionConfig;
      const baseUrl = config.baseUrl || this.defaultBaseUrl;
      const useModel = config.model || this.sdDefaultModel;

      // Check if SD is enabled (either globally or per-request)
      if (config.enabled === false) {
        throw new Error('Stable Diffusion não está habilitado');
      }

      // Check if Forge is available
      if (!this.isForgeAvailable && this.sdEnabled) {
        // Try to reconnect
        await this.checkForgeConnection();
        if (!this.isForgeAvailable) {
          throw new Error('Forge não está disponível. Verifique se o serviço está rodando.');
        }
      }

      this.logger.log(`Gerando imagem com prompt: "${generateDto.prompt.substring(0, 50)}..."`);
      this.logger.log(`Usando SD URL: ${baseUrl}, Model: ${useModel}`);

      // SDXL default dimensions
      const isSDXL = useModel.toLowerCase().includes('sdxl') || useModel.toLowerCase().includes('xl');
      const defaultWidth = isSDXL ? 1024 : 512;
      const defaultHeight = isSDXL ? 1024 : 512;

      const requestBody = {
        prompt: generateDto.prompt,
        negative_prompt: generateDto.negativePrompt || "low quality, blurry, distorted, deformed, ugly",
        steps: config.steps || (isSDXL ? 25 : 20),
        width: config.width || defaultWidth,
        height: config.height || defaultHeight,
        cfg_scale: config.cfgScale || 7,
        sampler_name: config.sampler || (isSDXL ? 'DPM++ 2M Karras' : 'Euler a'),
        batch_size: 1,
        n_iter: 1,
        seed: -1,
        ...(useModel && {
          override_settings: {
            sd_model_checkpoint: useModel
          }
        })
      };

      const headers = this.getAuthHeaders(config.token);

      const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(300000) // 5 minutos
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na geração SD: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.images || result.images.length === 0) {
        throw new Error('Nenhuma imagem foi gerada pelo SD');
      }

      // Salvar imagem
      const imageBase64 = result.images[0];
      const filename = `sd_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      const imagePath = path.join(this.imagesDir, filename);
      const imageUrl = `/images/${filename}`;

      // Converter base64 para buffer e salvar
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Imagem gerada e salva em ${processingTime}ms: ${filename}`);

      return {
        success: true,
        imagePath,
        imageUrl,
        filename,
        metadata: {
          prompt: generateDto.prompt,
          negativePrompt: generateDto.negativePrompt,
          parameters: requestBody,
          processingTime,
          model: useModel,
          info: result.info ? JSON.parse(result.info) : null
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Erro ao gerar imagem: ${error.message} (${processingTime}ms)`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém informações do sistema SD
   */
  async getSystemInfo(baseUrl?: string): Promise<any> {
    const url = baseUrl || this.defaultBaseUrl;
    
    try {
      const headers = this.getAuthHeaders();

      const response = await fetch(`${url}/sdapi/v1/memory`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Erro ao obter info do sistema: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Erro ao obter info do sistema SD: ${error.message}`);
      return null;
    }
  }

  /**
   * Interrompe geração em andamento
   */
  async interruptGeneration(baseUrl?: string): Promise<boolean> {
    const url = baseUrl || this.defaultBaseUrl;
    
    try {
      const headers = this.getAuthHeaders();

      const response = await fetch(`${url}/sdapi/v1/interrupt`, {
        method: 'POST',
        headers
      });

      return response.ok;
    } catch (error) {
      this.logger.error(`Erro ao interromper geração SD: ${error.message}`);
      return false;
    }
  }

  /**
   * Lista imagens salvas
   */
  async listSavedImages(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.imagesDir);
      return files
        .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.imagesDir, a));
          const statB = fs.statSync(path.join(this.imagesDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime(); // Mais recente primeiro
        });
    } catch (error) {
      this.logger.error(`Erro ao listar imagens: ${error.message}`);
      return [];
    }
  }

  /**
   * Remove imagens antigas (cleanup)
   */
  async cleanupOldImages(maxAgeHours = 24): Promise<number> {
    try {
      const files = fs.readdirSync(this.imagesDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.imagesDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        this.logger.log(`Removidas ${removedCount} imagens antigas (> ${maxAgeHours}h)`);
      }

      return removedCount;
    } catch (error) {
      this.logger.error(`Erro ao limpar imagens antigas: ${error.message}`);
      return 0;
    }
  }
}
