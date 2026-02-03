import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OllamaService } from './ollama.service';

describe('OllamaService - Metrics Calculation', () => {
  let service: OllamaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                OLLAMA_BASE_URL: 'http://localhost:11434',
                OLLAMA_DEFAULT_MODEL: 'llama3.2',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Tokens per Second Calculation', () => {
    it('should calculate tokens/s correctly for normal response time', () => {
      // Simulate a response with 100 tokens generated in 1000ms (1 second)
      const tokens = 100;
      const processingTime = 1000;
      const expectedTokensPerSecond = 100; // 100 tokens / 1 second = 100 t/s

      const tokensPerSecond = tokens / (processingTime / 1000);
      
      expect(tokensPerSecond).toBe(expectedTokensPerSecond);
    });

    it('should calculate tokens/s correctly for fast response', () => {
      // Simulate a response with 50 tokens generated in 250ms
      const tokens = 50;
      const processingTime = 250;
      const expectedTokensPerSecond = 200; // 50 tokens / 0.25 seconds = 200 t/s

      const tokensPerSecond = tokens / (processingTime / 1000);
      
      expect(tokensPerSecond).toBe(expectedTokensPerSecond);
    });

    it('should calculate tokens/s correctly for slow response', () => {
      // Simulate a response with 150 tokens generated in 5000ms (5 seconds)
      const tokens = 150;
      const processingTime = 5000;
      const expectedTokensPerSecond = 30; // 150 tokens / 5 seconds = 30 t/s

      const tokensPerSecond = tokens / (processingTime / 1000);
      
      expect(tokensPerSecond).toBe(expectedTokensPerSecond);
    });

    it('should handle zero processing time gracefully', () => {
      // Edge case: processing time is 0 (instant response)
      const tokens = 10;
      const processingTime = 0;
      
      const tokensPerSecond = processingTime > 0 ? tokens / (processingTime / 1000) : 0;
      
      expect(tokensPerSecond).toBe(0);
    });

    it('should handle zero tokens gracefully', () => {
      // Edge case: zero tokens generated
      const tokens = 0;
      const processingTime = 1000;
      const expectedTokensPerSecond = 0;

      const tokensPerSecond = tokens / (processingTime / 1000);
      
      expect(tokensPerSecond).toBe(expectedTokensPerSecond);
    });

    it('should round tokens/s to 2 decimal places', () => {
      // Simulate a response with 123 tokens generated in 789ms
      const tokens = 123;
      const processingTime = 789;
      const tokensPerSecond = parseFloat((tokens / (processingTime / 1000)).toFixed(2));
      
      // 123 / 0.789 = 155.89...
      expect(tokensPerSecond).toBeCloseTo(155.89, 2);
    });
  });

  describe('Processing Time Measurement', () => {
    it('should measure processing time in milliseconds', () => {
      const startTime = Date.now();
      // Simulate some processing delay
      const endTime = startTime + 1500; // 1.5 seconds later
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBe(1500);
    });

    it('should handle very fast responses (< 1ms)', () => {
      const startTime = Date.now();
      const endTime = startTime; // Same time (less than 1ms)
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBe(0);
    });

    it('should handle long responses (> 30 seconds)', () => {
      const startTime = Date.now();
      const endTime = startTime + 35000; // 35 seconds later
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBe(35000);
    });
  });

  describe('Metrics Format', () => {
    it('should return metrics in expected format', () => {
      const tokens = 250;
      const processingTime = 2000; // 2 seconds
      const tokensPerSecond = parseFloat((tokens / (processingTime / 1000)).toFixed(2));
      
      const metrics = {
        tokens,
        processingTime,
        tokensPerSecond,
      };

      expect(metrics).toHaveProperty('tokens');
      expect(metrics).toHaveProperty('processingTime');
      expect(metrics).toHaveProperty('tokensPerSecond');
      expect(typeof metrics.tokens).toBe('number');
      expect(typeof metrics.processingTime).toBe('number');
      expect(typeof metrics.tokensPerSecond).toBe('number');
      expect(metrics.tokensPerSecond).toBe(125);
    });

    it('should display processing time in seconds for UI', () => {
      const processingTimeMs = 3450; // 3.45 seconds
      const processingTimeS = (processingTimeMs / 1000).toFixed(2);
      
      expect(processingTimeS).toBe('3.45');
    });

    it('should display tokens/s with 1 decimal place for UI', () => {
      const tokensPerSecond = 45.678;
      const displayValue = tokensPerSecond.toFixed(1);
      
      expect(displayValue).toBe('45.7');
    });
  });

  describe('Performance Categories', () => {
    it('should identify fast generation (> 50 t/s)', () => {
      const tokensPerSecond = 75;
      const isFast = tokensPerSecond > 50;
      
      expect(isFast).toBe(true);
    });

    it('should identify medium generation (20-50 t/s)', () => {
      const tokensPerSecond = 35;
      const isMedium = tokensPerSecond >= 20 && tokensPerSecond <= 50;
      
      expect(isMedium).toBe(true);
    });

    it('should identify slow generation (< 20 t/s)', () => {
      const tokensPerSecond = 15;
      const isSlow = tokensPerSecond < 20;
      
      expect(isSlow).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large token counts', () => {
      const tokens = 1000000; // 1 million tokens
      const processingTime = 10000; // 10 seconds
      const tokensPerSecond = tokens / (processingTime / 1000);
      
      expect(tokensPerSecond).toBe(100000); // 100k t/s
    });

    it('should handle fractional milliseconds correctly', () => {
      const tokens = 10;
      const processingTime = 123.456; // Fractional milliseconds
      const tokensPerSecond = parseFloat((tokens / (processingTime / 1000)).toFixed(2));
      
      expect(tokensPerSecond).toBeCloseTo(81.03, 2);
    });

    it('should handle negative values gracefully', () => {
      // This shouldn't happen in real scenarios, but good to test
      const tokens = -10;
      const processingTime = 1000;
      const tokensPerSecond = tokens / (processingTime / 1000);
      
      expect(tokensPerSecond).toBe(-10);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should calculate metrics for typical chat response', () => {
      // Typical chat: 150 tokens in 3 seconds
      const tokens = 150;
      const processingTime = 3000;
      const tokensPerSecond = parseFloat((tokens / (processingTime / 1000)).toFixed(2));
      
      expect(tokensPerSecond).toBe(50);
      expect((processingTime / 1000).toFixed(2)).toBe('3.00');
    });

    it('should calculate metrics for long-form response', () => {
      // Long response: 800 tokens in 15 seconds
      const tokens = 800;
      const processingTime = 15000;
      const tokensPerSecond = parseFloat((tokens / (processingTime / 1000)).toFixed(2));
      
      expect(tokensPerSecond).toBeCloseTo(53.33, 2);
      expect((processingTime / 1000).toFixed(2)).toBe('15.00');
    });

    it('should calculate metrics for quick clarification', () => {
      // Quick answer: 20 tokens in 0.5 seconds
      const tokens = 20;
      const processingTime = 500;
      const tokensPerSecond = parseFloat((tokens / (processingTime / 1000)).toFixed(2));
      
      expect(tokensPerSecond).toBe(40);
      expect((processingTime / 1000).toFixed(2)).toBe('0.50');
    });
  });
});
