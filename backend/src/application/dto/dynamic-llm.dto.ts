import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ enum: ['system', 'user', 'assistant'] })
  @IsString()
  role: 'system' | 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  content: string;
}

/**
 * Provider-specific configuration
 */
export class ProviderConfigDto {
  @ApiPropertyOptional({ enum: DeviceType, default: DeviceType.CUDA })
  @IsOptional()
  @IsEnum(DeviceType)
  device?: DeviceType;

  @ApiPropertyOptional({ description: 'Time-to-live in seconds', default: 600 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  ttl?: number;

  // vLLM specific
  @ApiPropertyOptional({ description: 'GPU memory utilization (vLLM only)', minimum: 0.1, maximum: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(0.95)
  gpu_memory_utilization?: number;

  // llama.cpp specific
  @ApiPropertyOptional({ description: 'Number of GPU layers (llama.cpp only), -1 = all' })
  @IsOptional()
  @IsNumber()
  n_gpu_layers?: number;

  @ApiPropertyOptional({ description: 'Context window size (llama.cpp only)' })
  @IsOptional()
  @IsNumber()
  @Min(512)
  n_ctx?: number;
}

/**
 * Full Dynamic LLM chat completion request
 */
export class DynamicLLMChatRequestDto {
  @ApiProperty({ description: 'Model path' })
  @IsString()
  model: string;

  @ApiProperty({ enum: ProviderBackend })
  @IsEnum(ProviderBackend)
  backend: ProviderBackend;

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  config?: ProviderConfigDto;

  @ApiPropertyOptional({ description: 'Sampling temperature', minimum: 0.0, maximum: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(2.0)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Maximum tokens to generate' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_tokens?: number;

  @ApiPropertyOptional({ description: 'Top-p sampling', minimum: 0.0, maximum: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  top_p?: number;

  @ApiPropertyOptional({ description: 'Presence penalty', minimum: -2.0, maximum: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  presence_penalty?: number;

  @ApiPropertyOptional({ description: 'Frequency penalty', minimum: -2.0, maximum: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  frequency_penalty?: number;

  @ApiPropertyOptional({ description: 'Stop sequences', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @ApiPropertyOptional({ description: 'Enable streaming' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}

/**
 * Model download request
 */
export class ModelDownloadRequestDto {
  @ApiProperty({ description: 'HuggingFace model URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Destination folder name' })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ description: 'File patterns to include', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  include?: string[];

  @ApiPropertyOptional({ description: 'File patterns to exclude', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];

  @ApiPropertyOptional({ description: 'Specific GGUF quantization level' })
  @IsOptional()
  @IsString()
  quantization?: string;
}

/**
 * Model unload request
 */
export class ModelUnloadRequestDto {
  @ApiProperty({ description: 'Model path' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ enum: ProviderBackend })
  @IsOptional()
  @IsEnum(ProviderBackend)
  backend?: ProviderBackend;

  @ApiPropertyOptional({ enum: DeviceType })
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
