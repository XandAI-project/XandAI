import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OllamaService } from './ollama.service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OllamaService', () => {
  let service: OllamaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => {
              const config: Record<string, string> = {
                'OLLAMA_BASE_URL': 'http://localhost:11434',
                'OLLAMA_DEFAULT_MODEL': 'llama3.2',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Reset mocks before each test
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should generate a response using /api/chat endpoint', async () => {
      const mockResponse = {
        message: { content: 'Hello! How can I help you?' },
        eval_count: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.generateResponse('Hello', {
        model: 'llama3.2',
        temperature: 0.7,
      });

      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.model).toBe('llama3.2');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should fallback to /api/generate when /api/chat fails', async () => {
      // First call fails (chat endpoint)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second call succeeds (generate endpoint)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Fallback response' }),
      });

      const result = await service.generateResponse('Hello', {});

      expect(result.content).toBe('Fallback response');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when both endpoints fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.generateResponse('Hello', {})
      ).rejects.toThrow('Ollama API error: 404 Not Found');
    });

    it('should use custom baseUrl from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'Response' } }),
      });

      await service.generateResponse('Hello', {
        ollamaConfig: { baseUrl: 'http://custom:11434' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:11434/api/chat',
        expect.any(Object)
      );
    });

    it('should remove common prefixes from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'Assistant: Hello there!' } }),
      });

      const result = await service.generateResponse('Hi', {});

      expect(result.content).toBe('Hello there!');
    });
  });

  describe('generateResponseWithStreaming', () => {
    it('should stream tokens and call onToken callback', async () => {
      const tokens: string[] = [];
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"message":{"content":"Hello"}}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"message":{"content":" World"}}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"done":true,"eval_count":5}\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const onToken = jest.fn((token: string) => {
        tokens.push(token);
      });

      const result = await service.generateResponseWithStreaming(
        'Hello',
        { model: 'llama3.2' },
        onToken
      );

      expect(onToken).toHaveBeenCalled();
      expect(result.content).toContain('Hello');
    });
  });

  describe('isImageGenerationRequest', () => {
    it('should detect image generation requests in English', () => {
      expect(service.isImageGenerationRequest('generate an image of a cat')).toBe(true);
      expect(service.isImageGenerationRequest('create a picture of sunset')).toBe(true);
      expect(service.isImageGenerationRequest('draw me a dog')).toBe(true);
    });

    it('should detect image generation requests in Portuguese', () => {
      expect(service.isImageGenerationRequest('gere uma imagem de um gato')).toBe(true);
      expect(service.isImageGenerationRequest('crie uma foto de pôr do sol')).toBe(true);
    });

    it('should not detect non-image requests', () => {
      expect(service.isImageGenerationRequest('what is the weather?')).toBe(false);
      expect(service.isImageGenerationRequest('tell me a joke')).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await service.isAvailable();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    it('should return false when Ollama is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3.2' },
            { name: 'mistral' },
          ],
        }),
      });

      const models = await service.getAvailableModels();

      expect(models).toEqual(['llama3.2', 'mistral']);
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const models = await service.getAvailableModels();

      expect(models).toEqual([]);
    });
  });

  describe('generateConversationTitle', () => {
    it('should generate a title for the conversation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'Weather Question' } }),
      });

      const title = await service.generateConversationTitle('What is the weather today?');

      expect(title).toBe('Weather Question');
    });

    it('should return fallback title on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const title = await service.generateConversationTitle('Hello world test message');

      expect(title).toBeTruthy();
      expect(title.length).toBeLessThanOrEqual(40);
    });
  });

  describe('generateImagePrompt', () => {
    it('should generate optimized SD prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content: '{"prompt": "a beautiful sunset over mountains", "negativePrompt": "blurry"}',
          },
        }),
      });

      const result = await service.generateImagePrompt('Create a sunset image');

      expect(result.prompt).toContain('sunset');
      expect(result.negativePrompt).toBeTruthy();
    });

    it('should return fallback prompt on parse error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: { content: 'invalid json' } }),
      });

      const result = await service.generateImagePrompt('Create a cat image');

      expect(result.prompt).toBeTruthy();
      expect(result.negativePrompt).toBeTruthy();
    });
  });
});

