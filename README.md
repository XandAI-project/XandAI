# XandAI - Intelligent Virtual Assistant

## 🤖 Overview

XandAI is a modern and intelligent virtual assistant built with React and Material-UI, featuring complete integration with OLLAMA for local AI models and Stable Diffusion for image generation. The application offers an elegant chat interface with dark theme and advanced model management functionalities.

## ✨ Key Features

### 🎨 Modern Interface
- **Dark Theme**: Elegant and modern design optimized to reduce visual fatigue
- **Responsive**: Adaptive interface for desktop and mobile
- **Material-UI**: Consistent and accessible components
- **Smooth Animations**: Enhanced transitions and visual feedback

### 🧠 AI Integration
- **Multi-Provider Support**: Switch between Ollama and Dynamic LLM (XandRouting) backends
- **Dynamic LLM (XandRouting)**: Production-ready inference with vLLM and llama.cpp
  - GPU-optimized inference with vLLM
  - GGUF quantized models with llama.cpp
  - Intelligent model caching with TTL management
  - Built-in HuggingFace model downloader
- **OLLAMA Integration**: Connect with local AI models
- **Stable Diffusion**: Generate images from text prompts
- **Automatic Fallback**: Intelligent system that switches between providers
- **Model Selection**: Interface to choose and manage available models
- **Real-time Status**: Visual indicators of connection and model status
- **Flexible Configuration**: Full control over model parameters, GPU usage, and streaming

### 💬 Advanced Chat
- **Real-time Messages**: Fluid and responsive chat interface
- **Chat History**: Persistent conversation history with backend integration
- **Typing Indicators**: Visual feedback during processing
- **Session Management**: Complete control over chat sessions
- **Image Generation**: Generate images from chat responses
- **Attachment Support**: View generated images in chat history

### ⚙️ Flexible Configuration
- **Settings Panel**: Intuitive interface to configure OLLAMA and Stable Diffusion
- **Connectivity Testing**: Automatic service availability verification
- **Model Management**: Download, select, and remove models
- **Persistent Configuration**: Settings saved locally and on backend

## 🏗️ Architecture

The project follows Clean Architecture principles with clear separation of responsibilities:

```
src/
├── components/           # Reusable React components
│   ├── chat/            # Chat-specific components
│   ├── settings/        # Settings and panels
│   ├── auth/            # Authentication components
│   └── common/          # Shared components
├── application/         # Application layer
│   ├── hooks/           # Custom React hooks
│   └── services/        # Business services
├── domain/              # Entities and business rules
│   ├── entities/        # Data models
│   └── repositories/    # Repository interfaces
├── infrastructure/      # Infrastructure implementations
│   ├── api/             # External API integrations
│   └── mock-api/        # Mock implementations
└── styles/              # Global themes and styles
```

```
backend/
├── src/
│   ├── domain/          # Business entities and interfaces
│   ├── application/     # Use cases and DTOs
│   ├── infrastructure/  # Technical implementations
│   └── presentation/    # HTTP interface
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Docker and Docker Compose (for XandRouting backend)
- OLLAMA installed (optional, alternative AI backend)
- Stable Diffusion WebUI (optional, for image generation)
- NVIDIA GPU with CUDA support (recommended for vLLM/llama.cpp GPU inference)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/XandAI-project/XandAI.git
   cd XandAI
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure environment**
   ```bash
   cp env.local.example env.local
   ```

5. **Start the backend**
   ```bash
   cd backend
   npm run start:dev
   ```

6. **Start the frontend**
   ```bash
   npm start
   ```

7. **Access in browser**
   ```
   http://localhost:3000
   ```

### Dynamic LLM Backend (XandRouting)

XandAI now supports the **[XandRouting](https://github.com/XandAI-project/XandRouting)** backend - a production-ready LLM inference server with multi-backend support (vLLM and llama.cpp), intelligent caching, and OpenAI-compatible API.

#### Why Use XandRouting?

- **Multi-Backend Support**: Switch between vLLM (GPU-optimized) and llama.cpp (GGUF models) via API
- **Intelligent Caching**: Automatic TTL-based model management - models stay loaded for fast responses
- **Zero Configuration**: Load models on-demand via API, no configuration files needed
- **Built-in Model Downloader**: Download models directly from HuggingFace
- **OpenAI Compatible**: Drop-in replacement for OpenAI API

#### Setup XandRouting Backend

1. **Clone the repository**
   ```bash
   git clone https://github.com/XandAI-project/XandRouting.git
   cd XandRouting
   ```

2. **Start with Docker Compose**
   ```bash
   docker compose up -d
   ```
   
   The server will start on `http://localhost:8080` (or your configured IP).

3. **Download a model** (example with GGUF quantized model)
   ```bash
   curl -X POST http://192.168.0.5:8080/v1/models/download \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF",
       "quantization": "Q4_K_M"
     }'
   ```

4. **Check download status**
   ```bash
   # Get the job_id from previous response, then:
   curl http://192.168.0.5:8080/v1/models/download/{job_id}
   ```

5. **Configure XandAI to use XandRouting**
   
   Update your backend `.env` file:
   ```env
   DYNAMIC_LLM_BASE_URL=http://192.168.0.5:8080
   DYNAMIC_LLM_ENABLED=true
   ```

#### Using XandRouting from XandAI

Once configured, you can:

- **Select Provider**: Use the Provider Selector in the chat interface
- **Choose Backend**: Switch between vLLM and LlamaCPP
- **Configure Models**: Set model paths and parameters
- **Manage Models**: View loaded models, download new ones, check cache stats

**Model Path Formats:**

- **vLLM**: `/models/qwen3-coder-30b` (folder path)
- **LlamaCPP**: `/models/qwen3-iq4xs/Qwen3-Coder-30B-A3B-Instruct-IQ4_XS.gguf` (file path)

#### XandRouting Features

- **Dynamic Model Loading**: Load any model on-demand via API request
- **Intelligent Caching**: TTL-based automatic unloading
- **Streaming Support**: Real-time SSE streaming responses
- **Model Inventory**: Automatic discovery of downloaded models
- **GPU Memory Control**: Configure `gpu_memory_utilization` for vLLM
- **Partial GPU Offloading**: Use `n_gpu_layers` for llama.cpp mixed GPU/CPU inference

For complete documentation, see the [XandRouting repository](https://github.com/XandAI-project/XandRouting).

### OLLAMA Configuration (Optional)

To use local AI models, configure OLLAMA:

1. **Install OLLAMA**
   ```bash
   # Linux/macOS
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows: Download from official site
   ```

2. **Start the service**
   ```bash
   ollama serve
   ```

3. **Download models**
   ```bash
   ollama pull llama2:latest
   ollama pull mistral:latest
   ```

4. **Configure in XandAI**
   - Click the settings button in the header
   - Enable OLLAMA integration
   - Test the connection
   - Select a model

### Stable Diffusion Configuration (Optional)

To generate images, configure Stable Diffusion:

1. **Install Stable Diffusion WebUI**
   Follow the official installation guide

2. **Start with API enabled**
   ```bash
   ./webui.sh --api
   ```

3. **Configure in XandAI**
   - Open settings
   - Enable Stable Diffusion integration
   - Set the API URL (default: http://localhost:7860)
   - Test the connection

## 🎯 How to Use

### Main Interface

1. **Model Selector**: In the header, choose between Mock AI or OLLAMA models
2. **Chat**: Type messages in the input area
3. **Image Generation**: Click the image icon next to assistant messages
4. **Settings**: Access via settings button to manage OLLAMA and Stable Diffusion
5. **History**: Use the sidebar to navigate between conversations

### OLLAMA Settings

1. **Connection**: Configure OLLAMA URL (default: http://localhost:11434)
2. **Models**: View, select, and manage available models
3. **Status**: Monitor connectivity and model status
4. **Timeout**: Adjust timeout for requests

### Stable Diffusion Settings

1. **Connection**: Configure Stable Diffusion WebUI URL
2. **Models**: Select available models
3. **Parameters**: Adjust generation settings (steps, CFG scale, etc.)
4. **Token**: Configure authentication token if needed

### Chat Features

- **Send Messages**: Type and press Enter or click "Send"
- **Generate Images**: Click the image icon next to assistant responses
- **Automatic Fallback**: If OLLAMA fails, system uses mock responses automatically
- **History**: Conversations are saved with the backend
- **Indicators**: See when the assistant is "typing"

## 🔧 Advanced Configuration

### Environment Variables

Create an `env.local` file in the project root:

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:3001

# Default OLLAMA URL
REACT_APP_OLLAMA_DEFAULT_URL=http://localhost:11434

# Default Stable Diffusion URL
REACT_APP_SD_DEFAULT_URL=http://localhost:7860

# Enable debug
REACT_APP_DEBUG=true
```

### Theme Customization

Edit `src/styles/theme/theme.js` to customize colors and styles:

```javascript
export const customTheme = createTheme({
  palette: {
    primary: {
      main: '#your-primary-color',
    },
    // ... other configurations
  }
});
```

## 📚 Documentation

### Complete Documentation
- [Dynamic LLM Integration](docs/DYNAMIC_LLM_INTEGRATION.md) - XandRouting backend setup and usage guide
- [OLLAMA Integration](docs/OLLAMA_INTEGRATION.md) - Complete OLLAMA integration guide
- [Architecture](docs/README.md) - System architecture details

### APIs and Schemas

#### Main Entities

**OllamaConfig**
```javascript
{
  baseUrl: string,     // OLLAMA URL
  timeout: number,     // Timeout in ms
  selectedModel: string, // Selected model
  enabled: boolean     // If enabled
}
```

**StableDiffusionConfig**
```javascript
{
  baseUrl: string,     // Stable Diffusion URL
  enabled: boolean,    // If enabled
  model: string,       // Selected model
  steps: number,       // Generation steps
  cfgScale: number     // CFG Scale
}
```

**Message**
```javascript
{
  id: string,          // Unique ID
  content: string,     // Message content
  sender: 'user'|'assistant', // Sender
  timestamp: Date,     // Timestamp
  isTyping: boolean,   // If typing message
  attachments: Array   // Message attachments
}
```

## 🛠️ Available Scripts

### Development
```bash
npm start          # Start development server
npm test           # Run tests
npm run build      # Build for production
npm run eject      # Eject configuration (irreversible)
```

### Backend
```bash
cd backend
npm run start:dev  # Start development server
npm run build      # Build for production
npm run start:prod # Start production server
```

### Linting and Formatting
```bash
npm run lint       # Check code issues
npm run format     # Format code automatically
```

## 🧪 Testing

Run automated tests:

```bash
# Unit tests
npm test

# Tests with coverage
npm test -- --coverage

# Tests in watch mode
npm test -- --watch
```

## 📦 Build and Deploy

### Production Build
```bash
npm run build
```

### Backend Build
```bash
cd backend
npm run build
```

### Deploy
The build generates static files in the `build/` folder that can be served by any web server:

```bash
# Serve locally for testing
npx serve -s build

# Deploy to Netlify, Vercel, etc.
# Upload the build/ folder
```

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow established code standards
- Write tests for new features
- Document important changes
- Use semantic commits

## 📋 Roadmap

### Upcoming Features
- [ ] **User Authentication**: Login system and profiles
- [ ] **Multi-language Support**: Internationalization
- [ ] **Conversation Export**: PDF, text, etc.
- [ ] **Custom Plugins**: Extension system
- [ ] **Cloud Sync**: Automatic backup
- [ ] **Voice Commands**: Speech-to-text integration
- [ ] **Collaborative Mode**: Group chat

### Technical Improvements
- [ ] **PWA**: Progressive Web App
- [ ] **Offline Mode**: Offline functionality
- [ ] **Performance**: Loading optimizations
- [ ] **Accessibility**: A11y improvements
- [ ] **Docker**: Containerization

## 🐛 Known Issues

### OLLAMA
- First execution may be slow (model loading)
- Requires significant resources (CPU/GPU/RAM)
- Limited compatibility with supported models

### Stable Diffusion
- Requires Stable Diffusion WebUI running
- Generation can be slow depending on settings
- Model size affects memory usage

### Interface
- Mobile needs additional optimizations
- Some components may not work in older browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **XandRouting** - For the powerful multi-backend LLM inference server
- **vLLM Team** - For GPU-optimized LLM inference
- **llama.cpp** - For efficient GGUF model support
- **OLLAMA Team** - For the excellent local AI tool
- **Automatic1111** - For Stable Diffusion WebUI
- **Material-UI** - For the component system
- **React Team** - For the incredible framework
- **Open Source Community** - For inspiration and contributions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/XandAI-project/XandAI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/XandAI-project/XandAI/discussions)
- **Email**: support@xandai.com

---

**XandAI** - Building the future of AI interfaces, one conversation at a time. 🚀