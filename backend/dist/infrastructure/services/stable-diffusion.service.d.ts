import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export declare class StableDiffusionService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private readonly defaultBaseUrl;
    private readonly imagesDir;
    private readonly sdEnabled;
    private readonly sdApiUser;
    private readonly sdApiPassword;
    private readonly sdDefaultModel;
    private isForgeAvailable;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private checkForgeConnection;
    private getBasicAuthToken;
    private getAuthHeaders;
    private ensureImagesDirExists;
    getConfigStatus(): {
        enabled: boolean;
        available: boolean;
        baseUrl: string;
        defaultModel: string;
    };
    testConnection(baseUrl?: string, sdToken?: string): Promise<{
        success: boolean;
        message: string;
        version?: string;
    }>;
    getAvailableModels(baseUrl?: string, sdToken?: string): Promise<any[]>;
    generateImage(generateDto: GenerateImageDto): Promise<GeneratedImageResult>;
    getSystemInfo(baseUrl?: string): Promise<any>;
    interruptGeneration(baseUrl?: string): Promise<boolean>;
    listSavedImages(): Promise<string[]>;
    cleanupOldImages(maxAgeHours?: number): Promise<number>;
}
