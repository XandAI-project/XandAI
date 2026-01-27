# 🚀 WhatsApp AI Integration - Quick Start

## Instalação Rápida

### 1. Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend (se necessário)
cd ..
npm install
```

### 2. Executar Migrações do Banco

```bash
cd backend
npm run build
# As migrations serão executadas automaticamente na inicialização
```

### 3. Iniciar Serviços

#### Opção A: Development

```bash
# Backend (terminal 1)
cd backend
npm run start:dev

# Frontend (terminal 2)
npm start
```

#### Opção B: Docker Compose

```bash
docker-compose up -d
```

### 4. Acessar a Aplicação

1. Abra o navegador em `http://localhost:3000`
2. Faça login no XandAI
3. Clique no ícone do **WhatsApp** (verde) no cabeçalho
4. Clique em **"Conectar WhatsApp"**
5. Escaneie o QR Code com seu celular
6. Pronto! 🎉

## ⚡ Uso Rápido

### Conectar WhatsApp

1. **Clique no ícone do WhatsApp** no cabeçalho
2. **Clique em "Conectar WhatsApp"**
3. **Escaneie o QR Code** com o WhatsApp do celular
4. **Aguarde a confirmação** de conexão (status fica verde)

### Configurar Auto-Reply

1. **Auto-Reply é ativado automaticamente** após conectar
2. Para **pausar temporariamente**, clique em **"Pausar"**
3. Para **desativar completamente**, desative o toggle **"Auto-Reply"**
4. Para **desconectar**, clique em **"Desconectar"**

### Personalizar Comportamento

1. Clique na aba **"Configurações"**
2. Configure:
   - **Persona e Estilo**: Como a IA deve se comportar
   - **Comportamento**: Delays, contexto, etc.
   - **Segurança**: Blacklist, rate limits, filtros
   - **Modelo IA**: Modelo, temperature, tokens
3. Clique em **"Salvar Configurações"**

### Monitorar Mensagens

1. Clique na aba **"Mensagens"**
2. Veja todas as mensagens recebidas e enviadas
3. Identifique facilmente:
   - 📥 Mensagens recebidas (azul)
   - 📤 Mensagens enviadas pela IA (verde)
   - 🤖 Marcadas com badge "IA"

## 🔒 Controles de Emergência (Kill Switch)

### Parar Respostas Imediatamente

Escolha uma das opções:

1. **Botão "Pausar"** → Para temporariamente (mais rápido)
2. **Toggle "Auto-Reply" → OFF** → Desativa completamente
3. **Botão "Desconectar"** → Desconecta o WhatsApp

Todas são **INSTANTÂNEAS** ⚡

## ⚙️ Configurações Recomendadas

### Para Uso Pessoal

```yaml
Tom: friendly
Estilo: conversational
Delay: 2000-5000ms
Max Msgs/Hora: 30
Max Msgs/Chat/Hora: 5
Ignorar Grupos: ✅ Sim
Ignorar Mídia: ✅ Sim
```

### Para Uso Profissional

```yaml
Tom: professional
Estilo: concise
Delay: 1000-3000ms
Max Msgs/Hora: 50
Max Msgs/Chat/Hora: 10
Ignorar Grupos: ✅ Sim
Ignorar Mídia: ✅ Sim
```

### Para Uso Criativo

```yaml
Tom: friendly
Estilo: humorous
Delay: 3000-8000ms
Temperature: 1.2
Max Msgs/Hora: 20
Max Msgs/Chat/Hora: 3
Ignorar Grupos: ✅ Sim
Ignorar Mídia: ✅ Sim
```

## 🎯 Melhores Práticas

### ✅ Fazer

- ✅ Teste em conta secundária primeiro
- ✅ Configure rate limits conservadores
- ✅ Use delays realistas (2-5s)
- ✅ Monitore mensagens regularmente
- ✅ Ajuste a persona para seu estilo
- ✅ Use o Kill Switch quando necessário
- ✅ Faça backup do banco de dados

### ❌ Não Fazer

- ❌ Usar em conta principal sem testar
- ❌ Configurar delays muito curtos (<1s)
- ❌ Desabilitar rate limits completamente
- ❌ Responder para grupos (v1)
- ❌ Deixar sem monitoramento por muito tempo
- ❌ Usar instruções que violem ToS do WhatsApp

## 🐛 Troubleshooting Rápido

### QR Code não aparece
```bash
# Verifique se o backend está rodando
curl http://localhost:3001/health

# Verifique logs
cd backend
npm run start:dev
# Observe erros no console
```

### Não está respondendo
1. Status está **verde** (Conectado)? ✅
2. Auto-Reply está **ATIVO**? ✅
3. **NÃO está PAUSADO**? ✅
4. Contato não está na **blacklist**? ✅
5. Não atingiu **rate limit**? ✅

Se tudo acima está OK:
```bash
# Reinicie o backend
cd backend
npm run start:dev
```

### Desconectando sozinho
```bash
# Verifique conexão de rede
ping 8.8.8.8

# Verifique se há múltiplos WhatsApp Web conectados
# (apenas 4 dispositivos permitidos simultaneamente)

# Tente reconectar
```

### Mensagens duplicadas
```bash
# Reinicie o backend
cd backend
npm run start:dev

# Limpe cache do navegador
# Ctrl+Shift+Delete → Limpar tudo
```

## 📁 Estrutura de Arquivos Importantes

```
XandAI/
├── backend/
│   ├── whatsapp-sessions/        # Sessões WhatsApp (não commitar!)
│   ├── src/
│   │   ├── domain/entities/      # Entidades WhatsApp
│   │   ├── application/use-cases/# Lógica de negócio
│   │   ├── infrastructure/       # Integração WhatsApp Web
│   │   └── presentation/         # API REST
│   └── data/xandai.sqlite        # Banco de dados
├── src/
│   ├── components/whatsapp/      # UI Components
│   └── application/services/     # API Client
└── docs/
    └── WHATSAPP_INTEGRATION.md   # Documentação completa
```

## 🔧 Variáveis de Ambiente

Adicione ao `.env` (se necessário):

```env
# Backend
PORT=3001
DATABASE_TYPE=sqlite
DATABASE_NAME=./data/xandai.sqlite

# Ollama
OLLAMA_API_URL=http://localhost:11434

# WhatsApp (opcional)
WHATSAPP_SESSION_PATH=./whatsapp-sessions
```

## 📚 Documentação Completa

Para detalhes completos, consulte:
- **[docs/WHATSAPP_INTEGRATION.md](docs/WHATSAPP_INTEGRATION.md)** - Documentação técnica completa
- **Backend README**: `backend/README.md`
- **Frontend README**: `README.md`

## 🆘 Suporte

**Problemas?**
1. Consulte a documentação completa
2. Verifique logs do backend
3. Abra uma issue no GitHub

## ⚠️ Avisos Importantes

- Esta integração usa WhatsApp Web **não oficial**
- Use por sua **conta e risco**
- **Teste em conta secundária** primeiro
- Configure **rate limits conservadores**
- O WhatsApp pode **banir contas** que usam automação excessiva

---

**🎉 Aproveite sua integração WhatsApp AI!**

Desenvolvido para XandAI com ❤️
