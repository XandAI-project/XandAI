import { useState, useEffect, useCallback } from 'react';
import DynamicLLMApiRepository from '../../infrastructure/api/DynamicLLMApiRepository';

const STORAGE_KEY = 'dynamic-llm-config';

const DEFAULT_CONFIG = {
  provider: 'vllm',
  model: '',
  device: 'cuda',
  ttl: 600,
  temperature: 0.7,
  max_tokens: 2048,
  top_p: 0.95,
  presence_penalty: 0,
  frequency_penalty: 0,
  stop: [],
  stream: true,
  // Provider-specific
  gpu_memory_utilization: 0.9, // vLLM
  n_gpu_layers: -1, // llamacpp (-1 = all)
  n_ctx: 4096, // llamacpp
};

/**
 * Hook for managing Dynamic LLM provider state
 */
export const useDynamicLLM = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loadedModels, setLoadedModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repository] = useState(() => new DynamicLLMApiRepository());

  // Load configuration from localStorage on mount
  useEffect(() => {
    const loadConfig = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          setConfig({ ...DEFAULT_CONFIG, ...parsedConfig });
          console.log('📥 Loaded Dynamic LLM config from localStorage:', parsedConfig);
        }
      } catch (error) {
        console.error('Error loading Dynamic LLM config:', error);
      }
    };

    loadConfig();
  }, []);

  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      console.log('💾 Saved Dynamic LLM config to localStorage');
    } catch (error) {
      console.error('Error saving Dynamic LLM config:', error);
    }
  }, [config]);

  /**
   * Update configuration
   * @param {Object} updates - Configuration updates
   */
  const updateConfig = useCallback((updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Select provider backend
   * @param {string} backend - Provider backend (vllm, llamacpp, transformers)
   */
  const selectProvider = useCallback((backend) => {
    setConfig(prev => ({ ...prev, provider: backend }));
  }, []);

  /**
   * Set model path
   * @param {string} modelPath - Model path
   */
  const setModel = useCallback((modelPath) => {
    setConfig(prev => ({ ...prev, model: modelPath }));
  }, []);

  /**
   * Fetch loaded models from API
   */
  const fetchLoadedModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const models = await repository.getLoadedModels();
      setLoadedModels(models);
      console.log('📋 Loaded models fetched:', models);
      return models;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching loaded models:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  /**
   * Fetch available models from API
   */
  const fetchAvailableModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const models = await repository.getModelInventory();
      setAvailableModels(models);
      console.log('📋 Available models fetched:', models);
      return models;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching available models:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  /**
   * Check if a specific model is loaded
   * @param {string} modelPath - Model path to check
   * @returns {boolean} - Whether model is loaded
   */
  const isModelLoaded = useCallback((modelPath) => {
    return loadedModels.some(m => m.model === modelPath);
  }, [loadedModels]);

  /**
   * Download a model
   * @param {Object} downloadRequest - Download configuration
   * @returns {Promise<Object>} - Download job info
   */
  const downloadModel = useCallback(async (downloadRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.downloadModel(downloadRequest);
      console.log('⬇️ Download started:', result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error starting download:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  /**
   * Fetch download status
   * @param {string} jobId - Download job ID
   * @returns {Promise<Object>} - Download status
   */
  const getDownloadStatus = useCallback(async (jobId) => {
    try {
      const status = await repository.getDownloadStatus(jobId);
      return status;
    } catch (err) {
      console.error('Error fetching download status:', err);
      return null;
    }
  }, [repository]);

  /**
   * Fetch all downloads
   */
  const fetchDownloads = useCallback(async () => {
    try {
      const downloads = await repository.listDownloads();
      setDownloads(downloads);
      return downloads;
    } catch (err) {
      console.error('Error fetching downloads:', err);
      return [];
    }
  }, [repository]);

  /**
   * Cancel a download
   * @param {string} jobId - Download job ID
   */
  const cancelDownload = useCallback(async (jobId) => {
    try {
      await repository.cancelDownload(jobId);
      console.log('❌ Download cancelled:', jobId);
      // Refresh downloads list
      await fetchDownloads();
    } catch (err) {
      console.error('Error cancelling download:', err);
      throw err;
    }
  }, [repository, fetchDownloads]);

  /**
   * Unload a model
   * @param {Object} modelConfig - Model configuration
   */
  const unloadModel = useCallback(async (modelConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      await repository.unloadModel(modelConfig);
      console.log('🗑️ Model unloaded:', modelConfig);
      // Refresh loaded models
      await fetchLoadedModels();
    } catch (err) {
      setError(err.message);
      console.error('Error unloading model:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [repository, fetchLoadedModels]);

  /**
   * Unload all models
   */
  const unloadAllModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await repository.unloadAllModels();
      console.log('🗑️ All models unloaded');
      // Refresh loaded models
      await fetchLoadedModels();
    } catch (err) {
      setError(err.message);
      console.error('Error unloading all models:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [repository, fetchLoadedModels]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(async () => {
    try {
      const stats = await repository.getCacheStats();
      return stats;
    } catch (err) {
      console.error('Error fetching cache stats:', err);
      return null;
    }
  }, [repository]);

  /**
   * Get provider configuration for API request
   * @returns {Object} - Provider configuration
   */
  const getProviderConfig = useCallback(() => {
    return {
      backend: config.provider,
      model: config.model,
      device: config.device,
      ttl: config.ttl,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      presence_penalty: config.presence_penalty,
      frequency_penalty: config.frequency_penalty,
      stop: config.stop.length > 0 ? config.stop : undefined,
      stream: config.stream,
      // Provider-specific
      gpu_memory_utilization: config.provider === 'vllm' ? config.gpu_memory_utilization : undefined,
      n_gpu_layers: config.provider === 'llamacpp' ? config.n_gpu_layers : undefined,
      n_ctx: config.provider === 'llamacpp' ? config.n_ctx : undefined,
    };
  }, [config]);

  /**
   * Validate model path based on provider
   * @param {string} path - Model path
   * @param {string} backend - Provider backend
   * @returns {Object} - Validation result { valid: boolean, error?: string }
   */
  const validateModelPath = useCallback((path, backend) => {
    if (!path) {
      return { valid: false, error: 'Model path is required' };
    }

    if (backend === 'llamacpp') {
      // Must end with .gguf
      if (!path.endsWith('.gguf')) {
        return { 
          valid: false, 
          error: 'LlamaCPP requires a .gguf file path (e.g., /models/folder/model.gguf)' 
        };
      }
    } else if (backend === 'vllm' || backend === 'transformers') {
      // Must be a directory path (no file extension)
      if (path.includes('.gguf') || path.includes('.bin') || path.includes('.safetensors')) {
        return { 
          valid: false, 
          error: `${backend} requires a folder path (e.g., /models/model-name)` 
        };
      }
    }

    return { valid: true };
  }, []);

  return {
    config,
    updateConfig,
    selectProvider,
    setModel,
    loadedModels,
    availableModels,
    downloads,
    isLoading,
    error,
    fetchLoadedModels,
    fetchAvailableModels,
    isModelLoaded,
    downloadModel,
    getDownloadStatus,
    fetchDownloads,
    cancelDownload,
    unloadModel,
    unloadAllModels,
    getCacheStats,
    getProviderConfig,
    validateModelPath,
    repository,
  };
};

export default useDynamicLLM;
