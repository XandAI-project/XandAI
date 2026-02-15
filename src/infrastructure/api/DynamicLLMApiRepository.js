/**
 * Repository for Dynamic LLM API interactions
 * Supports vLLM and llama.cpp backends
 */
class DynamicLLMApiRepository {
  constructor() {
    // Get API base URL from environment or default to backend's base
    const backendBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.baseURL = `${backendBaseUrl}/api/v1/chat/providers`;
    console.log('🚀 Dynamic LLM API Repository initialized with base URL:', this.baseURL);
  }

  /**
   * Get authentication token from localStorage
   * @returns {string|null} - JWT token or null
   */
  getAuthToken() {
    return localStorage.getItem('token');
  }

  /**
   * Get authentication headers
   * @returns {Object} - Headers with authentication
   */
  getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Send message with Dynamic LLM provider
   * @param {string} message - User message
   * @param {Object} providerConfig - Provider configuration
   * @param {Function|null} onToken - Streaming callback (optional)
   * @returns {Promise<string|Object>} - AI response
   */
  async sendMessage(message, providerConfig, onToken = null) {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log('🚀 Sending message with Dynamic LLM provider:', providerConfig.backend);
      console.log('📝 Model:', providerConfig.model);

      // Build request body
      const requestBody = {
        content: message,
        provider: 'dynamic_llm',
        dynamicLLMConfig: {
          backend: providerConfig.backend,
          model: providerConfig.model,
          device: providerConfig.device || 'cuda',
          ttl: providerConfig.ttl || 600,
        },
        temperature: providerConfig.temperature || 0.7,
        maxTokens: providerConfig.max_tokens || 2048,
      };

      // Add optional completion parameters
      if (providerConfig.top_p !== undefined) {
        requestBody.top_p = providerConfig.top_p;
      }
      if (providerConfig.presence_penalty !== undefined) {
        requestBody.presence_penalty = providerConfig.presence_penalty;
      }
      if (providerConfig.frequency_penalty !== undefined) {
        requestBody.frequency_penalty = providerConfig.frequency_penalty;
      }
      if (providerConfig.stop && providerConfig.stop.length > 0) {
        requestBody.stop = providerConfig.stop;
      }

      // Add backend-specific parameters
      if (providerConfig.backend === 'vllm' && providerConfig.gpu_memory_utilization) {
        requestBody.dynamicLLMConfig.gpu_memory_utilization = providerConfig.gpu_memory_utilization;
      }

      if (providerConfig.backend === 'llamacpp') {
        if (providerConfig.n_gpu_layers !== undefined) {
          requestBody.dynamicLLMConfig.n_gpu_layers = providerConfig.n_gpu_layers;
        }
        if (providerConfig.n_ctx) {
          requestBody.dynamicLLMConfig.n_ctx = providerConfig.n_ctx;
        }
      }

      // Use streaming endpoint if callback provided
      if (onToken) {
        console.log('🌊 Using streaming endpoint...');
        
        const response = await fetch(`${this.baseURL.replace('/providers', '')}/messages/stream`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Request error: ${response.status}`);
        }

        // Handle SSE streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let sessionId = null;
        let metadata = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  throw new Error(data.error);
                }
                
                // Capture session ID when received
                if (data.sessionId) {
                  sessionId = data.sessionId;
                  console.log('📝 Session ID received and stored:', sessionId);
                }
                
                if (data.token !== undefined) {
                  fullResponse = data.fullText || (fullResponse + data.token);
                  onToken(data.token, fullResponse, false);
                }
                
                if (data.done) {
                  if (data.sessionId) {
                    sessionId = data.sessionId;
                  }
                  if (data.metadata) {
                    metadata = data.metadata;
                    console.log('📊 Metrics received:', metadata);
                  }
                  onToken('', fullResponse, true);
                }
              } catch (e) {
                if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) {
                  throw e;
                }
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.token) {
              fullResponse = data.fullText || (fullResponse + data.token);
            }
            if (data.sessionId) {
              sessionId = data.sessionId;
            }
          } catch (e) {
            // Ignore parsing errors on final chunk
          }
        }

        if (metadata) {
          return {
            content: fullResponse,
            metadata: metadata,
          };
        }

        return fullResponse;
      } else {
        // Non-streaming: use regular endpoint
        const response = await fetch(`${this.baseURL.replace('/providers', '')}/messages`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Request error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Backend response:', result);
        
        const assistantContent = result.assistantMessage?.content || result.content || result.message || 'Response received';
        return assistantContent;
      }
    } catch (error) {
      console.error('Error sending message to Dynamic LLM backend:', error);
      throw error;
    }
  }

  /**
   * Get list of currently loaded models
   * @returns {Promise<Array>} - Loaded models
   */
  async getLoadedModels() {
    try {
      const response = await fetch(`${this.baseURL}/models/loaded`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch loaded models: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching loaded models:', error);
      throw error;
    }
  }

  /**
   * Get model inventory (available models in /models/ directory)
   * @returns {Promise<Array>} - Available models
   */
  async getModelInventory() {
    try {
      const response = await fetch(`${this.baseURL}/models/inventory`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch model inventory: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching model inventory:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Cache stats
   */
  async getCacheStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cache stats: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      throw error;
    }
  }

  /**
   * Download a model from HuggingFace
   * @param {Object} downloadRequest - Download configuration
   * @returns {Promise<Object>} - Download job info
   */
  async downloadModel(downloadRequest) {
    try {
      const response = await fetch(`${this.baseURL}/models/download`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(downloadRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to start download: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error starting model download:', error);
      throw error;
    }
  }

  /**
   * Get download status
   * @param {string} jobId - Download job ID
   * @returns {Promise<Object>} - Download status
   */
  async getDownloadStatus(jobId) {
    try {
      const response = await fetch(`${this.baseURL}/models/download/${jobId}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch download status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching download status:', error);
      throw error;
    }
  }

  /**
   * List all downloads
   * @returns {Promise<Array>} - All download jobs
   */
  async listDownloads() {
    try {
      const response = await fetch(`${this.baseURL}/models/downloads`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch downloads: ${response.status}`);
      }

      const data = await response.json();
      return data.downloads || [];
    } catch (error) {
      console.error('Error fetching downloads:', error);
      throw error;
    }
  }

  /**
   * Cancel a download
   * @param {string} jobId - Download job ID
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelDownload(jobId) {
    try {
      const response = await fetch(`${this.baseURL}/models/download/${jobId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel download: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error cancelling download:', error);
      throw error;
    }
  }

  /**
   * Unload a specific model
   * @param {Object} modelConfig - Model configuration to unload
   * @returns {Promise<Object>} - Unload result
   */
  async unloadModel(modelConfig) {
    try {
      const response = await fetch(`${this.baseURL}/models/unload`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(modelConfig),
      });

      if (!response.ok) {
        throw new Error(`Failed to unload model: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unloading model:', error);
      throw error;
    }
  }

  /**
   * Unload all models
   * @returns {Promise<Object>} - Unload result
   */
  async unloadAllModels() {
    try {
      const response = await fetch(`${this.baseURL}/models/unload-all`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to unload all models: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error unloading all models:', error);
      throw error;
    }
  }
}

export default DynamicLLMApiRepository;
