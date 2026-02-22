# Dynamic LLM Integration Guide

Complete guide for integrating XandAI with the [XandRouting](https://github.com/XandAI-project/XandRouting) backend for production-ready LLM inference.

## Overview

XandRouting is a multi-backend LLM inference server that supports:
- **vLLM**: GPU-optimized inference with PagedAttention
- **llama.cpp**: Efficient GGUF quantized models with flexible GPU/CPU offloading

### Why XandRouting?

- **Fast Model Switching**: Intelligent caching means models stay loaded for instant responses
- **Zero Configuration**: Load models on-demand via API, no config files
- **Built-in Downloader**: Download models directly from HuggingFace
- **OpenAI Compatible**: Standard chat completions API
- **Production Ready**: Docker deployment with automatic model management

---

## Setup Instructions

### 1. Install XandRouting Backend

```bash
# Clone the repository
git clone https://github.com/XandAI-project/XandRouting.git
cd XandRouting

# Start with Docker Compose
docker compose up -d
```

The server will start on `http://localhost:8080` (default) or your configured IP.

### 2. Download Your First Model

#### Option A: GGUF Quantized Model (Recommended for most users)

```bash
curl -X POST http://192.168.0.13:8080/v1/models/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF",
    "quantization": "Q4_K_M"
  }'
```

#### Option B: Full Model for vLLM

```bash
curl -X POST http://192.168.0.13:8080/v1/models/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct",
    "destination": "qwen2.5-coder-7b"
  }'
```

### 3. Check Download Status

```bash
# Get job_id from the download response, then check status
curl http://192.168.0.13:8080/v1/models/download/{job_id}
```

Wait until `status: "completed"` before using the model.

### 4. Configure XandAI

Update `backend/.env` or `backend/env.example`:

```env
# Dynamic LLM API Configuration
DYNAMIC_LLM_BASE_URL=http://192.168.0.13:8080
DYNAMIC_LLM_ENABLED=true
```

### 5. Restart XandAI Backend

```bash
cd backend
npm run start:dev
```

---

## Using Dynamic LLM from XandAI

### Provider Selection

1. Open XandAI in your browser
2. Click the **Provider Selector** in the chat header
3. Select:
   - **vLLM** for GPU-optimized inference
   - **LlamaCPP** for GGUF quantized models
   - **Ollama** to switch back to Ollama

### Model Configuration

#### For vLLM (Full Models)

**Model Path Format**: `/models/qwen2.5-coder-7b` (folder path)

**Configuration**:
- Device: `cuda` (GPU) or `cpu`
- GPU Memory Utilization: `0.7` - `0.9` (recommended: 0.9)
- TTL: `600` seconds (10 minutes)

**Example Request**:
```json
{
  "model": "/models/qwen2.5-coder-7b",
  "backend": "vllm",
  "device": "cuda",
  "gpu_memory_utilization": 0.9,
  "ttl": 600
}
```

#### For LlamaCPP (GGUF Models)

**Model Path Format**: `/models/folder/model.gguf` (full file path)

**Configuration**:
- Device: `cuda` (mixed GPU/CPU) or `cpu`
- GPU Layers: `-1` (all on GPU) or specific number (e.g., `35`)
- Context Size: `2048` - `8192` (depends on model)
- TTL: `600` seconds

**Example Request**:
```json
{
  "model": "/models/qwen2.5-coder-7b-instruct-gguf/qwen2.5-coder-7b-instruct-q4_k_m.gguf",
  "backend": "llamacpp",
  "device": "cuda",
  "n_gpu_layers": -1,
  "n_ctx": 4096,
  "ttl": 600
}
```

---

## Model Management

### View Loaded Models

Check which models are currently in memory:

```bash
curl http://192.168.0.13:8080/v1/models/loaded
```

### View Available Models

See all downloaded models:

```bash
curl http://192.168.0.13:8080/v1/models/inventory
```

### Unload a Model

Free up memory by unloading a specific model:

```bash
curl -X POST http://192.168.0.13:8080/v1/models/unload \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen2.5-coder-7b",
    "backend": "vllm",
    "device": "cuda"
  }'
```

### Unload All Models

```bash
curl -X POST http://192.168.0.13:8080/v1/models/unload-all
```

---

## Model Path Reference

### vLLM Models
```
/models/qwen2.5-coder-7b
/models/llama-3-8b
/models/mistral-7b
```

### LlamaCPP Models (GGUF)
```
/models/qwen2.5-coder-7b-instruct-gguf/qwen2.5-coder-7b-instruct-q4_k_m.gguf
/models/llama3-q4/llama-3-8b-q4_k_m.gguf
/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf
```

**Important**: LlamaCPP requires the **full file path** including the `.gguf` extension!

---

## Completion Parameters

### All Configurable Parameters

```json
{
  "temperature": 0.7,          // Sampling temperature (0.0-2.0)
  "max_tokens": 2048,          // Maximum tokens to generate
  "top_p": 0.95,              // Nucleus sampling (0.0-1.0)
  "presence_penalty": 0.0,    // Presence penalty (-2.0 to 2.0)
  "frequency_penalty": 0.0,   // Frequency penalty (-2.0 to 2.0)
  "stop": ["END", "\n\n"],   // Stop sequences
  "stream": true              // Enable streaming responses
}
```

### Backend-Specific Parameters

**vLLM**:
```json
{
  "gpu_memory_utilization": 0.9,  // 0.1-0.95 (recommended: 0.9)
  "max_model_len": 32000          // Override max context (for mrope models)
}
```

**LlamaCPP**:
```json
{
  "n_gpu_layers": -1,  // -1 = all layers on GPU, or specific number
  "n_ctx": 4096        // Context window size (512-8192+)
}
```

---

## Performance Tuning

### GPU Memory Optimization

**vLLM**:
- `0.9`: Aggressive - Best performance (model must fit in VRAM)
- `0.7`: Balanced - Recommended default
- `0.5`: Conservative - Allows room for other processes

**LlamaCPP**:
```bash
# Full GPU (fastest)
"n_gpu_layers": -1

# Partial offload (35 layers to GPU, rest to RAM)
"n_gpu_layers": 35

# CPU only
"n_gpu_layers": 0
```

### TTL Configuration

```bash
# Short TTL (5 minutes) - frequent model switching
"ttl": 300

# Long TTL (1 hour) - stable workload
"ttl": 3600

# Persistent (effectively disable auto-unload)
"ttl": 86400
```

---

## Troubleshooting

### Model Not Found

**Issue**: `FileNotFoundError: Model not found at /models/...`

**Solutions**:
1. Check download completed: `GET /v1/models/download/{job_id}`
2. Verify model path: `GET /v1/models/inventory`
3. For LlamaCPP: Ensure full file path with `.gguf` extension

### CUDA Out of Memory

**Issue**: `RuntimeError: CUDA out of memory`

**Solutions**:
1. Reduce `gpu_memory_utilization` (try 0.5 or 0.3)
2. Use smaller model or different quantization
3. Use LlamaCPP with partial GPU: `"n_gpu_layers": 35`
4. Unload other models: `POST /v1/models/unload-all`

### vLLM rope_scaling Error

**Issue**: `AssertionError: assert "factor" in rope_scaling`

**Solution**: Use `max_model_len` parameter to bypass validation:
```json
{
  "model": "/models/qwen3-coder-30b",
  "backend": "vllm",
  "max_model_len": 32000
}
```

### Model Loading is Slow

**This is normal!** The first request loads the model into memory (can take 1-5 minutes depending on model size). Subsequent requests are instant thanks to caching.

**Tips**:
- Increase TTL to keep models loaded longer
- Pre-load models by sending a test request after download
- Monitor status with: `GET /v1/models/loaded`

---

## API Examples

### Python Client

```python
import requests

# Send chat completion
response = requests.post(
    'http://192.168.0.13:8080/v1/chat/completions',
    json={
        'model': '/models/qwen2.5-coder-7b-instruct-gguf/qwen2.5-coder-7b-instruct-q4_k_m.gguf',
        'backend': 'llamacpp',
        'device': 'cuda',
        'n_gpu_layers': -1,
        'messages': [
            {'role': 'user', 'content': 'Write a Python function to reverse a string'}
        ],
        'max_tokens': 500,
        'temperature': 0.7
    }
)

result = response.json()
print(result['choices'][0]['message']['content'])
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://192.168.0.13:8080/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: '/models/qwen2.5-coder-7b',
    backend: 'vllm',
    device: 'cuda',
    gpu_memory_utilization: 0.9,
    messages: [
      { role: 'user', content: 'Explain recursion' }
    ],
    max_tokens: 200
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

---

## Best Practices

1. **Pre-download models** before first use to avoid waiting during chat
2. **Monitor loaded models** regularly with `/v1/models/loaded`
3. **Use appropriate TTL** based on your usage patterns
4. **Start with GGUF models** (LlamaCPP) - they're more memory efficient
5. **Test with small models first** before downloading large ones
6. **Keep XandRouting updated** for latest optimizations and fixes

---

## Additional Resources

- [XandRouting GitHub Repository](https://github.com/XandAI-project/XandRouting)
- [XandRouting API Documentation](https://github.com/XandAI-project/XandRouting#api-reference)
- [vLLM Documentation](https://docs.vllm.ai/)
- [llama.cpp Documentation](https://github.com/ggerganov/llama.cpp)

---

**Need Help?**

- Open an issue on [XandAI GitHub](https://github.com/XandAI-project/XandAI/issues)
- Check [XandRouting Issues](https://github.com/XandAI-project/XandRouting/issues)
