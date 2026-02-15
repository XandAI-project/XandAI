/**
 * Utility functions for validating and formatting model paths
 * based on provider backend type
 */

/**
 * Validate model path based on provider
 * @param {string} path - Model path
 * @param {string} provider - Provider backend (vllm, llamacpp)
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateModelPath = (path, provider) => {
  if (!path || path.trim() === '') {
    return { valid: false, error: 'Model path is required' };
  }

  const trimmedPath = path.trim();

  if (provider === 'llamacpp') {
    // Must end with .gguf extension
    if (!trimmedPath.endsWith('.gguf')) {
      return {
        valid: false,
        error: 'LlamaCPP requires a .gguf file path',
        example: '/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf',
      };
    }

    // Must include directory path
    if (!trimmedPath.includes('/')) {
      return {
        valid: false,
        error: 'Path must include directory (e.g., /models/folder/file.gguf)',
      };
    }
  } else if (provider === 'vllm') {
    // Must be a directory path (no file extensions)
    const fileExtensions = ['.gguf', '.bin', '.safetensors', '.pt', '.pth'];
    if (fileExtensions.some(ext => trimmedPath.endsWith(ext))) {
      return {
        valid: false,
        error: 'vLLM requires a folder path, not a file',
        example: '/models/qwen3-coder-30b',
      };
    }

    // Should start with /models/ (recommended)
    if (!trimmedPath.startsWith('/models/')) {
      return {
        valid: true,
        warning: 'Path should typically start with /models/',
      };
    }
  }

  return { valid: true };
};

/**
 * Format model path for provider
 * @param {string} path - Model path
 * @param {string} provider - Provider backend
 * @returns {string} - Formatted path
 */
export const formatModelPathForProvider = (path, provider) => {
  if (!path) return '';

  let formatted = path.trim();

  // Ensure it starts with /models/ if it doesn't start with /
  if (!formatted.startsWith('/')) {
    formatted = '/models/' + formatted;
  }

  // Remove trailing slashes
  formatted = formatted.replace(/\/+$/, '');

  return formatted;
};

/**
 * Get placeholder text for model path input based on provider
 * @param {string} provider - Provider backend
 * @returns {string} - Placeholder text
 */
export const getModelPathPlaceholder = (provider) => {
  switch (provider) {
    case 'vllm':
      return '/models/qwen3-coder-30b';
    case 'llamacpp':
      return '/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf';
    default:
      return '/models/your-model';
  }
};

/**
 * Get example model paths for provider
 * @param {string} provider - Provider backend
 * @returns {Array<Object>} - Array of examples { path: string, description: string }
 */
export const getModelPathExamples = (provider) => {
  switch (provider) {
    case 'vllm':
      return [
        {
          path: '/models/qwen3-coder-30b',
          description: 'Qwen3 Coder 30B model folder',
        },
        {
          path: '/models/llama-3-8b',
          description: 'Llama 3 8B model folder',
        },
      ];
    case 'llamacpp':
      return [
        {
          path: '/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf',
          description: 'Qwen3 IQ4_XS quantized GGUF file',
        },
        {
          path: '/models/llama3-q4/llama-3-8b-q4_k_m.gguf',
          description: 'Llama 3 Q4_K_M quantized GGUF file',
        },
      ];
    default:
      return [];
  }
};

/**
 * Check if a path is a GGUF file path
 * @param {string} path - Model path
 * @returns {boolean} - True if path ends with .gguf
 */
export const isGGUFPath = (path) => {
  return path && path.trim().endsWith('.gguf');
};

/**
 * Extract model name from path
 * @param {string} path - Model path
 * @returns {string} - Model name
 */
export const extractModelName = (path) => {
  if (!path) return '';

  const trimmedPath = path.trim();
  
  // If it's a file path, get the filename
  if (trimmedPath.includes('/')) {
    const parts = trimmedPath.split('/');
    const lastPart = parts[parts.length - 1];
    
    // If it's a GGUF file, return filename without extension
    if (lastPart.endsWith('.gguf')) {
      return lastPart.replace('.gguf', '');
    }
    
    // Otherwise return the last directory name
    return lastPart;
  }

  return trimmedPath;
};

/**
 * Get provider-specific help text
 * @param {string} provider - Provider backend
 * @returns {string} - Help text
 */
export const getProviderHelpText = (provider) => {
  switch (provider) {
    case 'vllm':
      return 'vLLM requires a model folder path. The folder should contain model files (safetensors, bin, etc.) and config.json.';
    case 'llamacpp':
      return 'LlamaCPP requires the full path to a .gguf file, including the folder and filename.';
    default:
      return 'Enter the full path to your model.';
  }
};

/**
 * Check if model path is absolute
 * @param {string} path - Model path
 * @returns {boolean} - True if path is absolute (starts with /)
 */
export const isAbsolutePath = (path) => {
  return path && path.trim().startsWith('/');
};

/**
 * Normalize model path (trim, remove double slashes, etc.)
 * @param {string} path - Model path
 * @returns {string} - Normalized path
 */
export const normalizeModelPath = (path) => {
  if (!path) return '';

  let normalized = path.trim();
  
  // Replace multiple slashes with single slash
  normalized = normalized.replace(/\/+/g, '/');
  
  // Remove trailing slash (except for root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
};

export default {
  validateModelPath,
  formatModelPathForProvider,
  getModelPathPlaceholder,
  getModelPathExamples,
  isGGUFPath,
  extractModelName,
  getProviderHelpText,
  isAbsolutePath,
  normalizeModelPath,
};
