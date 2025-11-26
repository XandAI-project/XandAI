import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  Request,
  ValidationPipe,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException
} from '@nestjs/common';
import { Response } from 'express';
import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StableDiffusionService, GenerateImageDto, GeneratedImageResult } from '../../infrastructure/services/stable-diffusion.service';
import * as path from 'path';
import * as fs from 'fs';

export class GenerateImageRequestDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  steps?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  cfgScale?: number;

  @IsOptional()
  @IsString()
  sampler?: string;

  @IsOptional()
  @IsString()
  sdToken?: string;
}

export class TestConnectionDto {
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  sdToken?: string;
}

export class GenerateFromResponseDto {
  @IsString()
  chatResponse: string;

  @IsOptional()
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

/**
 * Controller para operações do Stable Diffusion
 */
@Controller('stable-diffusion')
export class StableDiffusionController {
  constructor(private readonly stableDiffusionService: StableDiffusionService) {}

  /**
   * Testa conexão com Stable Diffusion
   */
  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Body(ValidationPipe) testDto: TestConnectionDto,
  ): Promise<{ success: boolean; message: string; version?: string }> {
    return await this.stableDiffusionService.testConnection(testDto.baseUrl, testDto.sdToken);
  }

  /**
   * Obtém modelos disponíveis
   */
  @Get('models')
  async getModels(
    @Query('baseUrl') baseUrl?: string,
    @Query('sdToken') sdToken?: string,
  ): Promise<any[]> {
    return await this.stableDiffusionService.getAvailableModels(baseUrl, sdToken);
  }

  /**
   * Gera uma imagem
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateImage(
    @Body(ValidationPipe) generateDto: GenerateImageRequestDto,
  ): Promise<GeneratedImageResult> {
    const imageRequest: GenerateImageDto = {
      prompt: generateDto.prompt,
      negativePrompt: generateDto.negativePrompt,
      config: {
        baseUrl: generateDto.baseUrl,
        model: generateDto.model,
        steps: generateDto.steps,
        width: generateDto.width,
        height: generateDto.height,
        cfgScale: generateDto.cfgScale,
        sampler: generateDto.sampler,
        token: generateDto.sdToken,
        enabled: true // Se chegou até aqui, está habilitado
      }
    };

    return await this.stableDiffusionService.generateImage(imageRequest);
  }

  /**
   * Gera imagem baseada em resposta de chat
   */
  @Post('generate-from-response')
  @HttpCode(HttpStatus.CREATED)
  async generateFromResponse(
    @Body(ValidationPipe) body: GenerateFromResponseDto,
  ): Promise<GeneratedImageResult> {
    // Extrai prompt da resposta do chat
    const prompt = this.extractPromptFromChatResponse(body.chatResponse);
    
    const imageRequest: GenerateImageDto = {
      prompt,
      negativePrompt: "low quality, blurry, distorted, text, watermark",
      config: {
        baseUrl: body.config?.baseUrl,
        model: body.config?.model,
        steps: body.config?.steps,
        width: body.config?.width,
        height: body.config?.height,
        cfgScale: body.config?.cfgScale,
        sampler: body.config?.sampler,
        enabled: true
      }
    };

    return await this.stableDiffusionService.generateImage(imageRequest);
  }

  /**
   * Obtém informações do sistema
   */
  @Get('system-info')
  async getSystemInfo(
    @Query('baseUrl') baseUrl?: string,
  ): Promise<any> {
    return await this.stableDiffusionService.getSystemInfo(baseUrl);
  }

  /**
   * Interrompe geração em andamento
   */
  @Post('interrupt')
  @HttpCode(HttpStatus.OK)
  async interruptGeneration(
    @Body() body: { baseUrl?: string },
  ): Promise<{ success: boolean }> {
    const success = await this.stableDiffusionService.interruptGeneration(body.baseUrl);
    return { success };
  }

  /**
   * Lista imagens salvas
   */
  @Get('images')
  async listImages(): Promise<{ images: string[] }> {
    const images = await this.stableDiffusionService.listSavedImages();
    return { images };
  }

  /**
   * Serve uma imagem específica pelo nome do arquivo
   */
  @Get('images/:filename')
  async getImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    const imagePath = path.join(imagesDir, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException(`Image not found: ${sanitizedFilename}`);
    }

    // Determine content type
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Send the file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    fs.createReadStream(imagePath).pipe(res);
  }

  /**
   * Cleanup de imagens antigas
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupImages(
    @Body() body: { maxAgeHours?: number },
  ): Promise<{ removedCount: number }> {
    const removedCount = await this.stableDiffusionService.cleanupOldImages(body.maxAgeHours);
    return { removedCount };
  }

  /**
   * Extrai prompt de uma resposta de chat para geração de imagem
   */
  private extractPromptFromChatResponse(chatResponse: string): string {
    // Remove markdown e formatação
    let prompt = chatResponse
      .replace(/```[\s\S]*?```/g, '') // Remove blocos de código
      .replace(/`[^`]*`/g, '') // Remove código inline
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove itálico
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/>\s*/g, '') // Remove citações
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Remove links, mantém texto
      .replace(/\n+/g, ' ') // Substitui quebras de linha por espaços
      .replace(/\s+/g, ' ') // Remove espaços extras
      .trim();

    // Limita o tamanho do prompt
    if (prompt.length > 300) {
      prompt = prompt.substring(0, 300) + '...';
    }

    // Se o prompt ficar muito pequeno ou vazio, usa um prompt padrão
    if (prompt.length < 10) {
      prompt = 'a beautiful, detailed illustration';
    }

    return prompt;
  }
}
