# GPU Memory Troubleshooting Guide

## Issue: Model Shows CUDA but nvidia-smi Shows No Memory Usage

### Symptoms

When you check loaded models via the XandRouting API:
```json
{
    "loaded_models": [{
        "cache_key": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf:llamacpp",
        "model_path": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
        "backend": "llamacpp",
        "device": "cuda",
        "gpu_memory_utilization": 0.7,
        "loaded_at": "2026-02-17T20:44:14.749667"
    }]
}
```

But running `nvidia-smi` shows no GPU memory consumption.

### Root Causes

#### 1. **Model Not Actually Loaded** (Most Common)

The API may show the model as "loaded" but it hasn't actually initialized yet. This happens when:
- The model load failed silently
- The model is queued for loading but hasn't started
- The backend crashed during loading

**Verification:**
```bash
# Check XandRouting logs
docker logs xandrouting-gateway-1

# Or if running locally:
cd XandRouting
docker compose logs gateway
```

Look for errors like:
- `CUDA error: out of memory`
- `Failed to load model`
- `llama.cpp initialization failed`

#### 2. **Model Loaded on CPU Instead**

Even though `device: "cuda"` is specified, the model may have fallen back to CPU if:
- GPU is full
- CUDA libraries are missing
- llama.cpp wasn't compiled with CUDA support

**Verification:**
```bash
# Test with a small inference request and monitor CPU usage
curl -X POST http://192.168.0.5:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
    "backend": "llamacpp",
    "device": "cuda",
    "n_gpu_layers": -1,
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'

# In another terminal, watch GPU usage:
watch -n 0.5 nvidia-smi

# Also check CPU usage:
htop
```

If CPU usage spikes but GPU stays at 0%, the model is running on CPU.

#### 3. **n_gpu_layers = 0 or Not Set**

For llama.cpp, you MUST explicitly set `n_gpu_layers` to use GPU:
- `n_gpu_layers: -1` - All layers on GPU
- `n_gpu_layers: 0` - CPU only (default if not specified)
- `n_gpu_layers: 35` - First 35 layers on GPU, rest on CPU

**Fix:**
```bash
# Always specify n_gpu_layers for GPU usage
curl -X POST http://192.168.0.5:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
    "backend": "llamacpp",
    "device": "cuda",
    "n_gpu_layers": -1,
    "n_ctx": 4096,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### 4. **XandRouting Container Doesn't Have GPU Access**

Docker container might not have access to GPU.

**Verification:**
```bash
# Check if container can see GPU
docker exec xandrouting-gateway-1 nvidia-smi

# If you get "command not found" or "no devices found", GPU is not accessible
```

**Fix:** Update `docker-compose.yml` in XandRouting:
```yaml
services:
  gateway:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Then restart:
```bash
cd XandRouting
docker compose down
docker compose up -d
```

#### 5. **NVIDIA Container Toolkit Not Installed**

**Verification:**
```bash
# Check if nvidia-container-toolkit is installed
dpkg -l | grep nvidia-container-toolkit
```

**Fix:**
```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Diagnostic Steps

#### Step 1: Verify GPU Visibility

```bash
# From host
nvidia-smi

# From XandRouting container
docker exec xandrouting-gateway-1 nvidia-smi
```

Both should show your GPU. If container command fails, fix GPU access first.

#### Step 2: Check Actual Model Status

```bash
# Unload the "loaded" model
curl -X POST http://192.168.0.5:8080/v1/models/unload-all

# Try to load it again with GPU and watch nvidia-smi
curl -X POST http://192.168.0.5:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
    "backend": "llamacpp",
    "device": "cuda",
    "n_gpu_layers": -1,
    "ttl": 600,
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

Watch `nvidia-smi` in another terminal. You should see memory jump when model loads.

#### Step 3: Check XandRouting Logs

```bash
# Real-time logs
docker logs -f xandrouting-gateway-1

# Look for:
# - "Loading model with llama.cpp"
# - "Model loaded successfully"
# - CUDA initialization messages
# - Error messages
```

#### Step 4: Test with Known Working Configuration

```bash
# This should definitely use GPU if available
curl -X POST http://192.168.0.5:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
    "backend": "llamacpp",
    "device": "cuda",
    "n_gpu_layers": -1,
    "n_ctx": 2048,
    "messages": [
      {"role": "user", "content": "Write a hello world in Python"}
    ],
    "max_tokens": 100,
    "temperature": 0.7
  }'
```

### Solutions

#### Solution 1: Force Full GPU Loading

```bash
# Unload everything first
curl -X POST http://192.168.0.5:8080/v1/models/unload-all

# Load with explicit GPU settings
curl -X POST http://192.168.0.5:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
    "backend": "llamacpp",
    "device": "cuda",
    "n_gpu_layers": -1,
    "n_ctx": 4096,
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 50
  }'
```

#### Solution 2: Partial GPU Offload

If full GPU loading fails, try partial:

```bash
# Load only some layers on GPU (adjust based on your VRAM)
curl -X POST http://192.168.0.5:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf",
    "backend": "llamacpp",
    "device": "cuda",
    "n_gpu_layers": 35,
    "n_ctx": 4096,
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 50
  }'
```

#### Solution 3: Check XandRouting Build

XandRouting's llama.cpp worker must be built with CUDA support:

```bash
cd XandRouting
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Expected nvidia-smi Output

When a 30B GGUF model is loaded on GPU, you should see:

```
+-----------------------------------------------------------------------------+
| Processes:                                                                  |
|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |
|        ID   ID                                                   Usage      |
|=============================================================================|
|    0   N/A  N/A     12345      C   python                          18234MiB |
+-----------------------------------------------------------------------------+
```

Memory usage depends on:
- Model size (30B ≈ 15-20GB for IQ4_XS quantization)
- Context window (`n_ctx`)
- Number of GPU layers (`n_gpu_layers`)

### XandAI Configuration

In XandAI frontend, always configure:

1. **Provider Settings**:
   - Backend: LlamaCPP
   - Device: CUDA
   - GPU Layers: -1 (all)
   - Context: 4096 or 8192

2. **Model Path**: Full path with .gguf extension
   ```
   /models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf
   ```

### Still Not Working?

If GPU still shows no usage:

1. **Verify CUDA is working on host**:
   ```bash
   nvidia-smi
   nvcc --version
   ```

2. **Test GPU in Docker**:
   ```bash
   docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
   ```

3. **Check XandRouting issue tracker**:
   https://github.com/XandAI-project/XandRouting/issues

4. **File a bug report with**:
   - nvidia-smi output
   - XandRouting logs
   - Your docker-compose.yml
   - GPU model and VRAM size
   - CUDA version

### Performance Reference

Expected GPU memory usage by model size:

| Model Size | Quantization | GPU Memory (Full) | GPU Memory (35 layers) |
|-----------|-------------|-------------------|----------------------|
| 7B        | Q4_K_M      | ~4-5 GB          | ~2-3 GB              |
| 13B       | Q4_K_M      | ~8-10 GB         | ~4-6 GB              |
| 30B       | IQ4_XS      | ~15-18 GB        | ~8-10 GB             |
| 70B       | Q4_K_M      | ~40-50 GB        | ~20-25 GB            |

If your GPU doesn't have enough VRAM, use `n_gpu_layers` to partially offload to RAM.
