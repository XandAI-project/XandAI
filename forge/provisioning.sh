#!/bin/bash
# ===========================================
# XandAI - Forge Provisioning Script
# Downloads SDXL model on first run
# ===========================================

set -e

MODELS_DIR="/workspace/stable-diffusion-webui-forge/models/Stable-diffusion"
SDXL_MODEL_NAME="sd_xl_base_1.0.safetensors"
SDXL_MODEL_PATH="${MODELS_DIR}/${SDXL_MODEL_NAME}"

# Create models directory if it doesn't exist
mkdir -p "${MODELS_DIR}"

# Download SDXL model if not present
if [ ! -f "${SDXL_MODEL_PATH}" ]; then
    echo "📥 Downloading SDXL Base 1.0 model..."
    echo "This may take a while (~6.5GB)..."
    
    # Try to download from HuggingFace
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "${SDXL_MODEL_PATH}" \
            "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" || {
            echo "❌ Failed to download SDXL model"
            exit 1
        }
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "${SDXL_MODEL_PATH}" \
            "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" || {
            echo "❌ Failed to download SDXL model"
            exit 1
        }
    else
        echo "❌ Neither wget nor curl found. Cannot download model."
        exit 1
    fi
    
    echo "✅ SDXL model downloaded successfully!"
else
    echo "✅ SDXL model already present"
fi

# Download VAE for better quality (optional)
VAE_DIR="/workspace/stable-diffusion-webui-forge/models/VAE"
VAE_NAME="sdxl_vae.safetensors"
VAE_PATH="${VAE_DIR}/${VAE_NAME}"

mkdir -p "${VAE_DIR}"

if [ ! -f "${VAE_PATH}" ]; then
    echo "📥 Downloading SDXL VAE..."
    
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "${VAE_PATH}" \
            "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors" 2>/dev/null || {
            echo "⚠️ VAE download failed (optional, continuing...)"
        }
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "${VAE_PATH}" \
            "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors" 2>/dev/null || {
            echo "⚠️ VAE download failed (optional, continuing...)"
        }
    fi
fi

echo "🚀 Provisioning complete! Starting Forge..."

