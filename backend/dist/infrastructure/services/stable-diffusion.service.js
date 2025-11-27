"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StableDiffusionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StableDiffusionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let StableDiffusionService = StableDiffusionService_1 = class StableDiffusionService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StableDiffusionService_1.name);
        this.isForgeAvailable = false;
        this.sdEnabled = this.configService.get('SD_ENABLED', 'false') === 'true';
        this.defaultBaseUrl = this.configService.get('SD_BASE_URL', 'http://localhost:7685');
        this.sdApiUser = this.configService.get('SD_API_USER', '');
        this.sdApiPassword = this.configService.get('SD_API_PASSWORD', '');
        this.sdDefaultModel = this.configService.get('SD_DEFAULT_MODEL', 'sd_xl_base_1.0.safetensors');
        this.imagesDir = path.join(process.cwd(), 'public', 'images');
        this.ensureImagesDirExists();
    }
    async onModuleInit() {
        if (this.sdEnabled) {
            this.logger.log('🎨 Stable Diffusion auto-configuration enabled');
            this.logger.log(`   Base URL: ${this.defaultBaseUrl}`);
            await this.checkForgeConnection();
        }
    }
    async checkForgeConnection() {
        try {
            const result = await this.testConnection(this.defaultBaseUrl, this.getBasicAuthToken());
            this.isForgeAvailable = result.success;
            if (result.success) {
                this.logger.log('✅ Forge connection established successfully');
                const models = await this.getAvailableModels(this.defaultBaseUrl, this.getBasicAuthToken());
                if (models.length > 0) {
                    this.logger.log(`   Available models: ${models.map(m => m.model_name).join(', ')}`);
                }
            }
            else {
                this.logger.warn(`⚠️ Forge not available: ${result.message}`);
                this.logger.warn('   Image generation will be disabled until Forge is ready');
            }
        }
        catch (error) {
            this.logger.warn(`⚠️ Could not connect to Forge: ${error.message}`);
            this.isForgeAvailable = false;
        }
    }
    getBasicAuthToken() {
        if (this.sdApiUser && this.sdApiPassword) {
            const credentials = Buffer.from(`${this.sdApiUser}:${this.sdApiPassword}`).toString('base64');
            return `Basic ${credentials}`;
        }
        return null;
    }
    getAuthHeaders(customToken) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (customToken) {
            headers['Authorization'] = `Bearer ${customToken}`;
        }
        else {
            const basicAuth = this.getBasicAuthToken();
            if (basicAuth) {
                headers['Authorization'] = basicAuth;
            }
        }
        return headers;
    }
    ensureImagesDirExists() {
        try {
            if (!fs.existsSync(this.imagesDir)) {
                fs.mkdirSync(this.imagesDir, { recursive: true });
                this.logger.log(`Diretório de imagens criado: ${this.imagesDir}`);
            }
        }
        catch (error) {
            this.logger.error(`Erro ao criar diretório de imagens: ${error.message}`);
        }
    }
    getConfigStatus() {
        return {
            enabled: this.sdEnabled,
            available: this.isForgeAvailable,
            baseUrl: this.defaultBaseUrl,
            defaultModel: this.sdDefaultModel,
        };
    }
    async testConnection(baseUrl, sdToken) {
        const url = baseUrl || this.defaultBaseUrl;
        try {
            this.logger.log(`Testando conexão com SD: ${url}`);
            const headers = this.getAuthHeaders(sdToken);
            const response = await fetch(`${url}/sdapi/v1/sd-models`, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(10000)
            });
            if (response.ok) {
                this.isForgeAvailable = true;
                return {
                    success: true,
                    message: 'Conexão estabelecida com sucesso',
                    version: 'API disponível'
                };
            }
            const docsResponse = await fetch(`${url}/docs`, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(10000)
            });
            if (!docsResponse.ok) {
                throw new Error(`HTTP ${docsResponse.status}: ${docsResponse.statusText}`);
            }
            this.isForgeAvailable = true;
            return {
                success: true,
                message: 'Conexão estabelecida com sucesso',
                version: 'API disponível'
            };
        }
        catch (error) {
            this.logger.error(`Erro ao testar conexão SD: ${error.message}`);
            this.isForgeAvailable = false;
            return {
                success: false,
                message: error.message
            };
        }
    }
    async getAvailableModels(baseUrl, sdToken) {
        const url = baseUrl || this.defaultBaseUrl;
        try {
            const headers = this.getAuthHeaders(sdToken);
            const response = await fetch(`${url}/sdapi/v1/sd-models`, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) {
                throw new Error(`Erro ao buscar modelos: ${response.status}`);
            }
            const models = await response.json();
            this.logger.log(`Encontrados ${models.length} modelos SD`);
            return models.map(model => ({
                title: model.title,
                model_name: model.model_name,
                filename: model.filename
            }));
        }
        catch (error) {
            this.logger.error(`Erro ao buscar modelos SD: ${error.message}`);
            return [];
        }
    }
    async generateImage(generateDto) {
        const startTime = Date.now();
        try {
            const config = generateDto.config || {};
            const baseUrl = config.baseUrl || this.defaultBaseUrl;
            const useModel = config.model || this.sdDefaultModel;
            if (config.enabled === false) {
                throw new Error('Stable Diffusion não está habilitado');
            }
            if (!this.isForgeAvailable && this.sdEnabled) {
                await this.checkForgeConnection();
                if (!this.isForgeAvailable) {
                    throw new Error('Forge não está disponível. Verifique se o serviço está rodando.');
                }
            }
            this.logger.log(`Gerando imagem com prompt: "${generateDto.prompt.substring(0, 50)}..."`);
            this.logger.log(`Usando SD URL: ${baseUrl}, Model: ${useModel}`);
            const isSDXL = useModel.toLowerCase().includes('sdxl') || useModel.toLowerCase().includes('xl');
            const defaultWidth = isSDXL ? 1024 : 512;
            const defaultHeight = isSDXL ? 1024 : 512;
            const requestBody = {
                prompt: generateDto.prompt,
                negative_prompt: generateDto.negativePrompt || "low quality, blurry, distorted, deformed, ugly",
                steps: config.steps || (isSDXL ? 25 : 20),
                width: config.width || defaultWidth,
                height: config.height || defaultHeight,
                cfg_scale: config.cfgScale || 7,
                sampler_name: config.sampler || (isSDXL ? 'DPM++ 2M Karras' : 'Euler a'),
                batch_size: 1,
                n_iter: 1,
                seed: -1,
                ...(useModel && {
                    override_settings: {
                        sd_model_checkpoint: useModel
                    }
                })
            };
            const headers = this.getAuthHeaders(config.token);
            const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(300000)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro na geração SD: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const result = await response.json();
            if (!result.images || result.images.length === 0) {
                throw new Error('Nenhuma imagem foi gerada pelo SD');
            }
            const imageBase64 = result.images[0];
            const filename = `sd_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
            const imagePath = path.join(this.imagesDir, filename);
            const imageUrl = `/api/v1/stable-diffusion/images/${filename}`;
            const imageBuffer = Buffer.from(imageBase64, 'base64');
            fs.writeFileSync(imagePath, imageBuffer);
            const processingTime = Date.now() - startTime;
            this.logger.log(`Imagem gerada e salva em ${processingTime}ms: ${filename}`);
            return {
                success: true,
                imagePath,
                imageUrl,
                filename,
                metadata: {
                    prompt: generateDto.prompt,
                    negativePrompt: generateDto.negativePrompt,
                    parameters: requestBody,
                    processingTime,
                    model: useModel,
                    info: result.info ? JSON.parse(result.info) : null
                }
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`Erro ao gerar imagem: ${error.message} (${processingTime}ms)`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async getSystemInfo(baseUrl) {
        const url = baseUrl || this.defaultBaseUrl;
        try {
            const headers = this.getAuthHeaders();
            const response = await fetch(`${url}/sdapi/v1/memory`, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(5000)
            });
            if (!response.ok) {
                throw new Error(`Erro ao obter info do sistema: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            this.logger.error(`Erro ao obter info do sistema SD: ${error.message}`);
            return null;
        }
    }
    async interruptGeneration(baseUrl) {
        const url = baseUrl || this.defaultBaseUrl;
        try {
            const headers = this.getAuthHeaders();
            const response = await fetch(`${url}/sdapi/v1/interrupt`, {
                method: 'POST',
                headers
            });
            return response.ok;
        }
        catch (error) {
            this.logger.error(`Erro ao interromper geração SD: ${error.message}`);
            return false;
        }
    }
    async listSavedImages() {
        try {
            const files = fs.readdirSync(this.imagesDir);
            return files
                .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
                .sort((a, b) => {
                const statA = fs.statSync(path.join(this.imagesDir, a));
                const statB = fs.statSync(path.join(this.imagesDir, b));
                return statB.mtime.getTime() - statA.mtime.getTime();
            });
        }
        catch (error) {
            this.logger.error(`Erro ao listar imagens: ${error.message}`);
            return [];
        }
    }
    async cleanupOldImages(maxAgeHours = 24) {
        try {
            const files = fs.readdirSync(this.imagesDir);
            const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
            let removedCount = 0;
            for (const file of files) {
                const filePath = path.join(this.imagesDir, file);
                const stats = fs.statSync(filePath);
                if (stats.mtime.getTime() < cutoffTime) {
                    fs.unlinkSync(filePath);
                    removedCount++;
                }
            }
            if (removedCount > 0) {
                this.logger.log(`Removidas ${removedCount} imagens antigas (> ${maxAgeHours}h)`);
            }
            return removedCount;
        }
        catch (error) {
            this.logger.error(`Erro ao limpar imagens antigas: ${error.message}`);
            return 0;
        }
    }
};
exports.StableDiffusionService = StableDiffusionService;
exports.StableDiffusionService = StableDiffusionService = StableDiffusionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StableDiffusionService);
//# sourceMappingURL=stable-diffusion.service.js.map