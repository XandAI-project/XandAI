import { Response } from 'express';
import { StableDiffusionService, GeneratedImageResult } from '../../infrastructure/services/stable-diffusion.service';
export declare class GenerateImageRequestDto {
    prompt: string;
    negativePrompt?: string;
    baseUrl?: string;
    model?: string;
    steps?: number;
    width?: number;
    height?: number;
    cfgScale?: number;
    sampler?: string;
    sdToken?: string;
}
export declare class TestConnectionDto {
    baseUrl?: string;
    sdToken?: string;
}
export declare class GenerateFromResponseDto {
    chatResponse: string;
    config?: {
        baseUrl?: string;
        model?: string;
        steps?: number;
        width?: number;
        height?: number;
        cfgScale?: number;
        sampler?: string;
    };
}
export declare class StableDiffusionController {
    private readonly stableDiffusionService;
    constructor(stableDiffusionService: StableDiffusionService);
    testConnection(testDto: TestConnectionDto): Promise<{
        success: boolean;
        message: string;
        version?: string;
    }>;
    getModels(baseUrl?: string, sdToken?: string): Promise<any[]>;
    generateImage(generateDto: GenerateImageRequestDto): Promise<GeneratedImageResult>;
    generateFromResponse(body: GenerateFromResponseDto): Promise<GeneratedImageResult>;
    getSystemInfo(baseUrl?: string): Promise<any>;
    interruptGeneration(body: {
        baseUrl?: string;
    }): Promise<{
        success: boolean;
    }>;
    listImages(): Promise<{
        images: string[];
    }>;
    getImage(filename: string, res: Response): Promise<void>;
    cleanupImages(body: {
        maxAgeHours?: number;
    }): Promise<{
        removedCount: number;
    }>;
    private extractPromptFromChatResponse;
}
