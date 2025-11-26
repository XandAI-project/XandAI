# Stable Diffusion Forge Deployment

This guide explains how to deploy Stable Diffusion Forge alongside XandAI for AI image generation.

## Requirements

- **NVIDIA GPU** with CUDA support
- **12GB+ VRAM** recommended for SDXL models
- **nvidia-container-toolkit** installed on host
- **Docker** with GPU support enabled

### Installing NVIDIA Container Toolkit

```bash
# Ubuntu/Debian
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Deployment

### Option 1: Deploy with XandAI (Recommended)

```bash
# Deploy XandAI + Forge together
docker compose -f docker-compose.yml -f docker-compose.forge.yml up -d

# View logs
docker compose -f docker-compose.yml -f docker-compose.forge.yml logs -f forge
```

### Option 2: Deploy Forge Standalone

If you already have XandAI running and want to add Forge:

```bash
# First, set environment variables
export SD_ENABLED=true
export SD_BASE_URL=http://forge:7860

# Deploy Forge
docker compose -f docker-compose.forge.yml up -d forge

# Rebuild backend to pick up SD config
docker compose build backend
docker compose up -d backend
```

## Accessing Forge

- **WebUI**: http://your-server:7685
- **API Docs**: http://your-server:7685/docs
- **API Endpoint**: http://your-server:7685/sdapi/v1/

## First Run

On first startup, Forge will:
1. Download base dependencies (~2GB)
2. Initialize the WebUI
3. You'll need to download an SDXL model manually via the WebUI

### Downloading SDXL Model

1. Access the WebUI at http://your-server:7685
2. Go to the "Checkpoints" tab
3. Download "sd_xl_base_1.0.safetensors" from Civitai or HuggingFace
4. Or use the Extensions tab to install a model downloader

### Pre-downloading Models (Optional)

You can mount a local models directory with pre-downloaded models:

```yaml
# In docker-compose.forge.yml
volumes:
  - /path/to/your/models:/workspace/stable-diffusion-webui-forge/models/Stable-diffusion
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SD_ENABLED` | `false` | Enable SD integration in backend |
| `SD_BASE_URL` | `http://forge:7860` | Forge API URL |
| `SD_API_USER` | `` | API username (optional) |
| `SD_API_PASSWORD` | `` | API password (optional) |
| `SD_DEFAULT_MODEL` | `sd_xl_base_1.0.safetensors` | Default model to use |
| `SD_PORT` | `7685` | External port for Forge WebUI |

### Enabling API Authentication

If you want to secure the Forge API:

1. Set environment variables:
```bash
export SD_API_USER=your_username
export SD_API_PASSWORD=your_password
```

2. Update docker-compose.forge.yml to add auth:
```yaml
environment:
  WEBUI_FLAGS: >-
    --api
    --api-auth your_username:your_password
    --listen
```

## Using Image Generation in XandAI

Once Forge is running and XandAI backend is configured:

1. Open XandAI chat interface
2. Enable Stable Diffusion in Settings
3. Configure the SD URL: `http://your-server:7685`
4. Select an available model
5. Click the image icon on any AI response to generate an image

## Troubleshooting

### Forge not starting
```bash
# Check logs
docker compose -f docker-compose.yml -f docker-compose.forge.yml logs forge

# Check GPU access
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

### Out of memory errors
- Reduce image resolution (512x512 instead of 1024x1024)
- Use a smaller model (SD 1.5 instead of SDXL)
- Enable `--medvram` or `--lowvram` flags

### Connection refused from backend
- Ensure Forge is healthy: `docker compose ps`
- Check network: `docker network inspect xandai_xandai-network`
- Verify SD_BASE_URL is correct

## Resource Usage

| Component | VRAM | RAM | Disk |
|-----------|------|-----|------|
| SDXL Base | 8-12GB | 8GB+ | ~7GB |
| SD 1.5 | 4-6GB | 4GB+ | ~4GB |
| Forge Base | 2GB | 4GB | ~5GB |

## Stopping Forge

```bash
# Stop only Forge
docker compose -f docker-compose.yml -f docker-compose.forge.yml stop forge

# Remove Forge and volumes
docker compose -f docker-compose.yml -f docker-compose.forge.yml down forge -v
```

