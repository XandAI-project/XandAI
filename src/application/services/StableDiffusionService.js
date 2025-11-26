import { StableDiffusionConfig } from '../../domain/entities/StableDiffusionConfig.js';

/**
 * Serviço para integração com Stable Diffusion
 */
export class StableDiffusionService {
  constructor() {
    this.configKey = 'stable_diffusion_config';
    this.config = null;
    this.loadConfig();
  }

  /**
   * Carrega a configuração do localStorage
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem(this.configKey);
      if (saved) {
        const configData = JSON.parse(saved);
        this.config = StableDiffusionConfig.fromObject(configData);
      } else {
        this.config = StableDiffusionConfig.createDefault();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Erro ao carregar configuração SD:', error);
      this.config = StableDiffusionConfig.createDefault();
    }
  }

  /**
   * Salva a configuração no localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(this.config.toObject()));
    } catch (error) {
      console.error('Erro ao salvar configuração SD:', error);
    }
  }

  /**
   * Obtém a configuração atual
   * @returns {Promise<StableDiffusionConfig>}
   */
  async getConfiguration() {
    return this.config;
  }

  /**
   * Atualiza a configuração
   * @param {Object} updates - Atualizações da configuração
   * @returns {Promise<StableDiffusionConfig>}
   */
  async updateConfiguration(updates) {
    this.config.update(updates);
    this.saveConfig();
    return this.config;
  }

  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean} - Se está autenticado
   */
  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * Verifica se o token é válido fazendo uma requisição de teste
   * @returns {Promise<boolean>} - Se o token é válido
   */
  async checkTokenValidity() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await fetch('/api/v1/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  }

  /**
   * Trata erros de autenticação fazendo logout automático
   */
  handleAuthError() {
    console.warn('Token inválido detectado - fazendo logout...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Recarrega a página para forçar redirecionamento para login
    window.location.reload();
  }

  /**
   * Testa a conexão com o Stable Diffusion através do backend (evita CORS)
   * @returns {Promise<Object>} Status da conexão
   */
  async testConnection() {
    try {
      if (!this.config.baseUrl) {
        throw new Error('URL não configurada');
      }

      const response = await fetch('/api/v1/stable-diffusion/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseUrl: this.config.baseUrl,
          sdToken: this.config.token || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name
      };
    }
  }

  /**
   * Obtém modelos disponíveis através do backend
   * @returns {Promise<Array>}
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`/api/v1/stable-diffusion/models?baseUrl=${encodeURIComponent(this.config.baseUrl)}&sdToken=${encodeURIComponent(this.config.token || '')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar modelos: ${response.status}`);
      }

      const models = await response.json();
      return models;
    } catch (error) {
      console.error('Erro ao buscar modelos SD:', error);
      return [];
    }
  }

  /**
   * Gera uma imagem usando Stable Diffusion através do backend
   * @param {string} prompt - Prompt para geração
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} Resultado da geração
   */
  async generateImage(prompt, options = {}) {
    try {
      if (!this.config.enabled) {
        throw new Error('Stable Diffusion não está habilitado');
      }

      const requestBody = {
        prompt: prompt,
        negativePrompt: options.negativePrompt || "low quality, blurry, distorted",
        baseUrl: this.config.baseUrl,
        model: options.model || this.config.model,
        steps: options.steps || this.config.steps,
        width: options.width || this.config.width,
        height: options.height || this.config.height,
        cfgScale: options.cfgScale || this.config.cfgScale,
        sampler: options.sampler || this.config.sampler,
        sdToken: this.config.token || null
      };

      const response = await fetch('/api/v1/stable-diffusion/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro na geração: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém informações do sistema
   * @returns {Promise<Object>}
   */
  async getSystemInfo() {
    try {
      const response = await fetch(`${this.config.baseUrl}/sdapi/v1/memory`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Erro ao obter info do sistema: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao obter info do sistema:', error);
      return null;
    }
  }

  /**
   * Interrompe geração em andamento
   * @returns {Promise<boolean>}
   */
  async interruptGeneration() {
    try {
      const response = await fetch(`${this.config.baseUrl}/sdapi/v1/interrupt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao interromper geração:', error);
      return false;
    }
  }
}
