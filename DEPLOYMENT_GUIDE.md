# Quick Deployment Guide

## 🚀 Ready to Deploy

All code is complete and ready for testing. Follow these steps to get started.

---

## Step 1: Build the Project

```powershell
# Navigate to project root
cd C:\Users\keyce\XandAI

# Build Docker images
docker compose build
```

**Expected Time**: 5-10 minutes  
**Success Criteria**: No build errors, images created successfully

---

## Step 2: Configure Environment

Create/update your `.env` file:

```env
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=xandai
DATABASE_PASSWORD=xandai_password
DATABASE_NAME=xandai_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Ollama (existing)
OLLAMA_BASE_URL=http://192.168.0.13:11434

# Dynamic LLM API (NEW)
DYNAMIC_LLM_BASE_URL=http://192.168.0.13:8080
DYNAMIC_LLM_ENABLED=true

# API Base URL for Frontend
REACT_APP_API_URL=http://192.168.0.13:3001

# Stable Diffusion (existing)
STABLE_DIFFUSION_API_URL=http://192.168.0.13:7860
STABLE_DIFFUSION_ENABLED=true
```

---

## Step 3: Start Services

```powershell
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

**Services Started**:
- PostgreSQL database (port 5432)
- XandAI backend (port 3001)
- XandAI frontend (port 80)

---

## Step 4: Verify XandRouting is Running

```powershell
# Check if XandRouting is accessible
curl http://192.168.0.13:8080/health

# Or in PowerShell
Invoke-WebRequest -Uri http://192.168.0.13:8080/health
```

**Expected Response**: `{"status":"healthy"}` or similar

**If Not Running**:
```bash
# Start XandRouting
cd path/to/XandRouting
docker compose up -d
```

---

## Step 5: Access XandAI

Open browser and navigate to:
- **Local**: http://localhost
- **Network**: http://192.168.0.13

**First Time**:
1. Create account or login
2. You'll see the chat interface

---

## Step 6: Test Ollama (Existing Functionality)

1. In chat interface, provider should default to "Ollama"
2. Send a test message: "Hello, how are you?"
3. Verify you get a response
4. Check streaming works

**If Issues**: Check Ollama is running at http://192.168.0.13:11434

---

## Step 7: Configure Dynamic LLM

### 7.1: Switch to Dynamic LLM

1. Click **Provider Selector** in header (dropdown button)
2. Hover over "Dynamic LLM Backends"
3. Select either:
   - **vLLM** - for HuggingFace models
   - **LlamaCPP** - for GGUF models

### 7.2: Configure Model Path

Click the **Settings icon** (⚙️) to open Provider Settings Dialog:

**For vLLM**:
- Model Path: `/models/qwen3-coder-30b` (folder path)
- Device: CUDA (GPU)
- GPU Memory Utilization: 0.9
- TTL: 600 seconds

**For LlamaCPP**:
- Model Path: `/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf` (file path)
- Device: CUDA (GPU)
- GPU Layers: -1 (all layers)
- Context Window: 4096

**Adjust Completion Parameters**:
- Temperature: 0.7 (default)
- Max Tokens: 2048
- Top-P: 0.95
- Presence/Frequency Penalties: 0

Click **Save Changes**

### 7.3: Check Model Status

Look for **Model Status Indicator** in header:
- 🟢 **Green Checkmark**: Model is loaded and ready
- 🟡 **Yellow Warning**: Model not loaded (will load on first request)
- ⏳ **Loading**: Model is currently loading

---

## Step 8: Test Dynamic LLM

1. Ensure Dynamic LLM provider is selected
2. Ensure model path is configured
3. Send a test message: "Write a Python hello world"
4. **First Request**:
   - May show warning if model not loaded
   - Will take 30-60 seconds to load model
   - Watch model status indicator change
5. **Subsequent Requests**:
   - Should be instant (model cached)
   - No loading delay

**Verify**:
- Message sent successfully
- Response received
- Streaming works (text appears gradually)
- Model status shows green checkmark

---

## Step 9: Test Model Management

### View Loaded Models

1. Click **Settings** (⚙️) in header
2. Look for "Model Manager" option (or implement integration)
3. Open Model Manager
4. Go to **"Loaded Models"** tab
5. Verify your model appears:
   - Model path shown
   - Backend type (vLLM/LlamaCPP)
   - Device (cuda/cpu)
   - Load time
   - TTL information

### View Model Inventory

1. In Model Manager, go to **"Inventory"** tab
2. See all models available on XandRouting
3. Check which models are loaded vs available

### Download New Model

1. Go to **"Download New Model"** tab
2. Enter:
   - **URL**: `https://huggingface.co/bartowski/Qwen3-Coder-30B-A3B-Instruct-GGUF`
   - **Destination**: `qwen3-test`
   - **Quantization**: `IQ4_XS`
3. Click **Start Download**
4. Go to **"Downloads"** tab
5. Watch progress

### Unload Models

1. In "Loaded Models" tab
2. Click **Unload** button next to a model
3. Verify model disappears from loaded list
4. GPU memory should be freed (check with `nvidia-smi`)

---

## Step 10: Verify GPU Usage (LlamaCPP)

When using LlamaCPP with GPU, verify memory is actually used:

```powershell
# Watch GPU memory in real-time
watch -n 0.5 nvidia-smi

# Or in PowerShell (run in separate window)
while ($true) { cls; nvidia-smi; Start-Sleep -Seconds 0.5 }
```

**Expected for 30B Model**:
- ~15-18 GB GPU memory consumed
- Python process visible in nvidia-smi
- GPU utilization during inference

**If No GPU Memory Used**:
- See `docs/TROUBLESHOOTING_GPU.md`
- Check `n_gpu_layers` is set to -1
- Verify Docker container has GPU access
- Check XandRouting logs for errors

---

## 🐛 Troubleshooting

### Backend Won't Start

```powershell
# Check logs
docker compose logs backend

# Common issues:
# - Database not ready: wait 30s and retry
# - Port 3001 in use: stop other services
# - TypeScript errors: run npm install again
```

### Frontend Won't Build

```powershell
# Check logs
docker compose logs frontend

# Common issues:
# - npm install failed: check network
# - Build errors: check syntax errors in new components
```

### Can't Connect to XandRouting

```powershell
# Test connectivity
curl http://192.168.0.13:8080/health

# Check if running
docker ps | grep xandrouting

# Start if not running
cd path/to/XandRouting
docker compose up -d
```

### Model Not Loading

1. Check XandRouting logs:
   ```bash
   docker logs xandrouting-gateway-1
   ```

2. Verify model path exists in XandRouting:
   ```bash
   docker exec xandrouting-gateway-1 ls -la /models/
   ```

3. Check API response:
   ```bash
   curl http://192.168.0.13:8080/models/inventory
   ```

### GPU Not Being Used

See detailed guide: `docs/TROUBLESHOOTING_GPU.md`

**Quick Checks**:
1. Set `n_gpu_layers: -1` (LlamaCPP)
2. Verify Docker has GPU access: `docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi`
3. Check XandRouting container runtime: `docker inspect xandrouting-gateway-1 | grep -i runtime`
4. Ensure NVIDIA Container Toolkit installed

---

## 📊 Success Checklist

### Basic Functionality
- [ ] XandAI starts without errors
- [ ] Can login/create account
- [ ] Ollama provider works
- [ ] Can send and receive messages
- [ ] Streaming works

### Dynamic LLM Integration
- [ ] Can switch to Dynamic LLM provider
- [ ] Provider selector shows options
- [ ] Can open Provider Settings Dialog
- [ ] Can configure model path
- [ ] Model path validation works
- [ ] Can save configuration

### vLLM Backend
- [ ] Can configure vLLM model
- [ ] Can send message with vLLM
- [ ] Model loads automatically
- [ ] Subsequent requests are fast
- [ ] Streaming works
- [ ] Model status indicator updates

### LlamaCPP Backend
- [ ] Can configure LlamaCPP model
- [ ] Can send message with LlamaCPP
- [ ] Model loads automatically
- [ ] Subsequent requests are fast
- [ ] Streaming works
- [ ] GPU memory is actually used (check nvidia-smi)
- [ ] Model status indicator updates

### Model Management
- [ ] Can view loaded models
- [ ] Can view model inventory
- [ ] Can download new model
- [ ] Download progress displays
- [ ] Can cancel download
- [ ] Can unload models
- [ ] Cache stats display

### UI Components
- [ ] ProviderSelector displays correctly
- [ ] ModelStatusIndicator shows status
- [ ] ProviderSettingsDialog opens
- [ ] ModelManager displays all tabs
- [ ] All icons and tooltips work

---

## 📚 Next Steps After Testing

### If Everything Works
1. Document any issues found
2. Create production environment configuration
3. Set up monitoring and logging
4. Configure backups
5. Set up CI/CD pipeline

### If Issues Found
1. Document exact error messages
2. Check relevant logs
3. Consult troubleshooting guides:
   - `docs/DYNAMIC_LLM_INTEGRATION.md`
   - `docs/TROUBLESHOOTING_GPU.md`
   - `BUILD_FIX_SUMMARY.md`
4. Report issues with full context

---

## 🆘 Getting Help

### Documentation
- **Integration Guide**: `docs/DYNAMIC_LLM_INTEGRATION.md`
- **GPU Troubleshooting**: `docs/TROUBLESHOOTING_GPU.md`
- **Build Fixes**: `BUILD_FIX_SUMMARY.md`
- **Implementation Status**: `INTEGRATION_COMPLETE.md`

### Logs to Check
```powershell
# XandAI Backend
docker compose logs backend

# XandAI Frontend
docker compose logs frontend

# XandRouting
docker logs xandrouting-gateway-1

# Database
docker compose logs postgres
```

### Common Commands
```powershell
# Restart all services
docker compose restart

# Rebuild after code changes
docker compose build && docker compose up -d

# View real-time logs
docker compose logs -f

# Check GPU status
nvidia-smi

# Test API endpoints
curl http://192.168.0.13:8080/health
curl http://192.168.0.13:3001/api/v1/health
```

---

**Ready to begin testing!** 🚀

Start with Step 1 and work through each step. The entire process should take 15-30 minutes for initial setup and testing.
