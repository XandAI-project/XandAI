import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Provider backend types
 */
export enum ProviderBackend {
  VLLM = 'vllm',
  LLAMACPP = 'llamacpp',
}

/**
 * Device types
 */
export enum DeviceType {
  CUDA = 'cuda',
  CPU = 'cpu',
}

/**
 * Chat message for completion request
 */
export class ChatMessageDto {
  @IsString()
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

/**
 * Provider-specific configuration
 */
export class ProviderConfigDto {
  @IsOptional()
  @IsEnum(DeviceType)
  device?: DeviceType;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  ttl?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(0.95)
  gpu_memory_utilization?: number;

  @IsOptional()
  @IsNumber()
  n_gpu_layers?: number;

  @IsOptional()
  @IsNumber()
  @Min(512)
  n_ctx?: number;
}

/**
 * Full Dynamic LLM chat completion request
 */
export class DynamicLLMChatRequestDto {
  @IsString()
  model: string;

  @IsEnum(ProviderBackend)
  backend: ProviderBackend;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  config?: ProviderConfigDto;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(2.0)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_tokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  top_p?: number;

  @IsOptional()
  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  presence_penalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  frequency_penalty?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

/**
 * Model download request
 */
export class ModelDownloadRequestDto {
  @IsString()
  url: string;

  @IsString()
  destination: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];

  @IsOptional()
  @IsString()
  quantization?: string;
}

/**
 * Model unload request
 */
export class ModelUnloadRequestDto {
  @IsString()
  model: string;

  @IsOptional()
  @IsEnum(ProviderBackend)
  backend?: ProviderBackend;

  @IsOptional()
  @IsEnum(DeviceType)
  device?: DeviceType;
}

/**
 * Loaded model information
 */
export interface LoadedModelDto {
  model: string;
  backend: string;
  device: string;
  ttl: number;
  ttlRemaining?: number;
  loadedAt?: string;
}

/**
 * Model inventory item
 */
export interface ModelInventoryItemDto {
  name: string;
  path: string;
  size: number;
  sizeGB: string;
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  recommendedBackend?: string[];
  quantization?: string;
  metadata?: any;
}

/**
 * Cache statistics
 */
export interface CacheStatsDto {
  totalModels: number;
  hits: number;
  misses: number;
  memoryUsage?: {
    used: number;
    total: number;
    unit: string;
  };
}

/**
 * Download job status
 */
export interface DownloadJobDto {
  jobId: string;
  url: string;
  destination: string;
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  downloadedSize?: number;
  totalSize?: number;
  speed?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}
