import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for integrating with Dynamic LLM API
 * Supports vLLM and llama.cpp backends
 */
@Injectable()
export class DynamicLLMService {
  private readonly logger = new Logger(DynamicLLMService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'DYNAMIC_LLM_BASE_URL',
      'http://192.168.0.13:8080',
    );
    this.logger.log(`🚀 Dynamic LLM Service initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Send chat completion request
   * @param request - Chat completion request
   * @returns Promise with completion response
   */
  async chatCompletion(request: any): Promise<any> {
    try {
      this.logger.log(`📤 Sending chat completion request to ${this.baseUrl}/v1/chat/completions`);
      this.logger.debug(`Request: ${JSON.stringify(request)}`);

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Chat completion failed: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Chat completion successful`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error in chat completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send streaming chat completion request
   * @param request - Chat completion request with stream: true
   * @returns ReadableStream for SSE events
   */
  async chatCompletionStream(request: any): Promise<ReadableStream> {
    try {
      this.logger.log(`📤 Sending streaming chat completion request`);
      
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Streaming chat completion failed: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.logger.log(`✅ Streaming started`);
      return response.body;
    } catch (error) {
      this.logger.error(`❌ Error in streaming chat completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of currently loaded models
   * @returns Promise with loaded models information
   */
  async getLoadedModels(): Promise<any> {
    try {
      this.logger.log(`📋 Fetching loaded models`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/loaded`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to fetch loaded models: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Loaded models fetched: ${data.models?.length || 0} models`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error fetching loaded models: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get model inventory (available models in /models/ directory)
   * @returns Promise with model inventory
   */
  async getModelInventory(): Promise<any> {
    try {
      this.logger.log(`📋 Fetching model inventory`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/inventory`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to fetch model inventory: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Model inventory fetched: ${data.models?.length || 0} models`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error fetching model inventory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns Promise with cache stats
   */
  async getCacheStats(): Promise<any> {
    try {
      this.logger.log(`📊 Fetching cache statistics`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/stats`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to fetch cache stats: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Cache stats fetched`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error fetching cache stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unload a specific model configuration
   * @param config - Model configuration to unload
   * @returns Promise with unload result
   */
  async unloadModel(config: { model: string; backend?: string; device?: string }): Promise<any> {
    try {
      this.logger.log(`🗑️ Unloading model: ${config.model}`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/unload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to unload model: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Model unloaded successfully`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error unloading model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unload all models
   * @returns Promise with unload result
   */
  async unloadAllModels(): Promise<any> {
    try {
      this.logger.log(`🗑️ Unloading all models`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/unload-all`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to unload all models: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ All models unloaded successfully`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error unloading all models: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start model download from HuggingFace
   * @param downloadRequest - Download configuration
   * @returns Promise with download job information
   */
  async downloadModel(downloadRequest: {
    url: string;
    destination: string;
    include?: string[];
    exclude?: string[];
    quantization?: string;
  }): Promise<any> {
    try {
      this.logger.log(`⬇️ Starting model download: ${downloadRequest.url}`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to start download: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Download started: ${data.jobId}`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error starting download: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get download job status
   * @param jobId - Download job ID
   * @returns Promise with download status
   */
  async getDownloadStatus(jobId: string): Promise<any> {
    try {
      this.logger.log(`📊 Fetching download status for job: ${jobId}`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/download/${jobId}`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to fetch download status: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Download status fetched: ${data.status}`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error fetching download status: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all download jobs
   * @returns Promise with all download jobs
   */
  async listDownloads(): Promise<any> {
    try {
      this.logger.log(`📋 Fetching all downloads`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/download`);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to fetch downloads: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Downloads fetched: ${data.downloads?.length || 0} jobs`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error fetching downloads: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a running download
   * @param jobId - Download job ID
   * @returns Promise with cancellation result
   */
  async cancelDownload(jobId: string): Promise<any> {
    try {
      this.logger.log(`❌ Cancelling download: ${jobId}`);
      
      const response = await fetch(`${this.baseUrl}/v1/models/download/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Failed to cancel download: ${response.status} - ${errorText}`);
        throw new Error(`Dynamic LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.logger.log(`✅ Download cancelled successfully`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error cancelling download: ${error.message}`);
      throw error;
    }
  }

  /**
   * Health check for Dynamic LLM API
   * @returns Promise<boolean> - true if API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.logger.log(`🏥 Performing health check`);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      const isHealthy = response.ok;
      this.logger.log(`${isHealthy ? '✅' : '❌'} Health check ${isHealthy ? 'passed' : 'failed'}`);
      return isHealthy;
    } catch (error) {
      this.logger.error(`❌ Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if Dynamic LLM API is available
   * @returns Promise<boolean> - true if available
   */
  async isAvailable(): Promise<boolean> {
    return this.healthCheck();
  }
}
