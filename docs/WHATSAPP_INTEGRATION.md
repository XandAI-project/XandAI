# 📱 Integração WhatsApp AI - XandAI

## Visão Geral

A integração WhatsApp permite que o XandAI responda automaticamente mensagens do WhatsApp usando Inteligência Artificial, agindo como o dono da conta. Todas as mensagens recebidas são interceptadas, processadas pela IA e respondidas automaticamente sem necessidade de aprovação manual.

## 🎯 Funcionalidades Principais

### ✅ Conexão WhatsApp
- Autenticação via QR Code
- Sessão persistente
- Auto-reconexão
- Desconexão instantânea (Kill Switch)

### ✅ Auto-Reply Inteligente
- **Resposta automática** para todas as mensagens 1:1
- **Contexto de conversa** mantido por chat
- **Persona configurável** (tom, estilo, idioma)
- **Delay humanizado** entre recebimento e resposta
- **Simulação de "digitando..."** para parecer mais natural

### ✅ Controles de Segurança
- **Kill Switch**: Pausa respostas automáticas instantaneamente
- **Toggle Auto-Reply**: Liga/desliga resposta automática
- **Rate Limiting**: Limita mensagens por hora (global e por chat)
- **Blacklist/Whitelist**: Bloqueia ou permite contatos específicos
- **Palavras-chave bloqueadas**: Ignora mensagens com termos específicos
- **Filtros**: Ignora grupos e mensagens com mídia (v1)

### ✅ Proteção contra Loops
- **Deduplicação de mensagens**: Previne processamento duplicado
- **Detecção de mensagens próprias**: Ignora mensagens enviadas pela própria IA
- **Rate limiting por chat**: Evita spam para o mesmo contato

### ✅ Interface Web
- **Status da conexão** em tempo real
- **QR Code** para conectar
- **Histórico de mensagens** (recebidas e enviadas)
- **Configurações personalizadas** de persona e comportamento
- **Controles de pausa/retomar**

## 🚀 Como Usar

### 1. Acessar WhatsApp Integration

No XandAI, clique no ícone do **WhatsApp** (verde) no cabeçalho principal.

### 2. Conectar sua Conta

1. Clique em **"Conectar WhatsApp"**
2. Aguarde o QR Code ser gerado (3-5 segundos)
3. Abra o WhatsApp no celular
4. Vá em **Menu** → **Aparelhos conectados** → **Conectar um aparelho**
5. Escaneie o QR Code exibido na tela
6. Aguarde a confirmação de conexão

### 3. Configurar Auto-Reply

Uma vez conectado, você pode:

- **Ativar/Desativar Auto-Reply**: Toggle no painel principal
- **Pausar temporariamente**: Botão "Pausar" (Kill Switch)
- **Configurar Persona**: Aba "Configurações" → "Persona e Estilo"
- **Ajustar segurança**: Aba "Configurações" → "Segurança e Limites"

### 4. Monitorar Mensagens

Na aba **"Mensagens"** você pode:
- Ver todas as mensagens recebidas e enviadas
- Identificar quais foram geradas pela IA
- Ver metadata (modelo usado, tokens, etc.)
- Filtrar por status

## ⚙️ Configurações Avançadas

### Persona e Estilo

Configure como a IA deve se comportar:

- **Tom de Voz**: friendly, professional, casual, formal
- **Estilo**: conversational, concise, detailed, humorous
- **Idioma**: pt-BR, en-US, es-ES, etc.
- **Instruções Personalizadas**: Texto livre para guiar o comportamento

### Comportamento

- **Simular "digitando..."**: Mostra indicador de digitação (mais humano)
- **Delay de Resposta**: Tempo entre receber e responder (2-10s padrão)
- **Contexto de Conversa**: Quantas mensagens anteriores incluir (10 padrão)

### Segurança e Limites

- **Ignorar Grupos**: Não responde mensagens de grupos (recomendado)
- **Ignorar Mídia**: Não responde mensagens com imagem/vídeo/áudio
- **Max Mensagens/Hora**: Limite global de mensagens por hora (30 padrão)
- **Max Mensagens por Chat/Hora**: Limite por contato (5 padrão)
- **Contatos Bloqueados**: Lista de números que serão ignorados
- **Palavras-chave Bloqueadas**: Mensagens com essas palavras são ignoradas

### Modelo IA

- **Modelo Padrão**: llama3.2, mistral, etc.
- **Temperature**: Criatividade das respostas (0.0 = conservador, 2.0 = criativo)
- **Max Tokens**: Tamanho máximo da resposta

## 🔒 Segurança e Privacidade

### Dados Armazenados

- **Sessão WhatsApp**: Armazenada localmente em `./whatsapp-sessions`
- **Mensagens**: Salvas no banco de dados com:
  - Conteúdo da mensagem
  - Metadata (contato, horário, status)
  - Resposta da IA gerada
- **Configurações**: Preferências do usuário

### Kill Switch

Em caso de emergência, você pode:

1. **Pausar respostas**: Botão "Pausar" no painel principal
2. **Desativar Auto-Reply**: Toggle "Auto-Reply"
3. **Desconectar completamente**: Botão "Desconectar"

Todas essas ações são **instantâneas** e param o processamento imediatamente.

### Proteções Implementadas

✅ **Deduplicação**: Evita processar a mesma mensagem duas vezes
✅ **Loop Prevention**: Não responde mensagens próprias
✅ **Rate Limiting**: Previne spam e uso excessivo
✅ **Blacklist**: Permite bloquear contatos problemáticos
✅ **Filtros**: Ignora grupos e mídias por padrão

## 📊 Monitoramento

### Status da Conexão

Os status possíveis são:

- **🔴 Desconectado**: WhatsApp não conectado
- **⚠️ Aguardando QR**: QR Code gerado, aguardando scan
- **🔄 Conectando**: Autenticando após scan do QR
- **🟢 Conectado**: Pronto e funcionando
- **❌ Erro**: Problema na conexão
- **⏱️ Expirado**: Sessão expirou, necessário reconectar

### Informações Exibidas

- Número conectado
- Status do Auto-Reply (ON/OFF)
- Status de Pausa (Pausado/Ativo)
- Total de mensagens processadas
- Última atividade

## 🛠️ Troubleshooting

### QR Code não aparece

- Aguarde 5-10 segundos após clicar em "Conectar"
- Clique em "Atualizar QR Code"
- Verifique se o backend está rodando
- Verifique logs do backend para erros

### Não está respondendo mensagens

1. Verifique se está **Conectado** (status verde)
2. Verifique se **Auto-Reply está ATIVO**
3. Verifique se **NÃO está PAUSADO**
4. Verifique se o contato não está na **blacklist**
5. Verifique se não atingiu o **rate limit**

### Respostas muito lentas

- Ajuste o **Delay de Resposta** nas configurações
- Verifique se o modelo de IA está respondendo rápido
- Verifique recursos do servidor (CPU/RAM)

### Desconectando sozinho

- Pode ser problema de rede
- Certifique-se que o servidor está estável
- Verifique se o WhatsApp Web no celular está funcionando
- Tente desconectar e reconectar

### Mensagens duplicadas

- A proteção contra duplicação está ativa por padrão
- Se persistir, reinicie o backend
- Verifique logs para identificar o problema

## 🏗️ Arquitetura Técnica

### Backend (NestJS)

```
backend/src/
├── domain/
│   ├── entities/
│   │   ├── whatsapp-session.entity.ts
│   │   ├── whatsapp-message.entity.ts
│   │   └── whatsapp-config.entity.ts
│   └── repositories/
│       └── whatsapp-*.repository.interface.ts
├── application/
│   ├── dto/
│   │   └── whatsapp.dto.ts
│   └── use-cases/
│       └── whatsapp.use-case.ts
├── infrastructure/
│   ├── services/
│   │   └── whatsapp.service.ts
│   └── repositories/
│       └── whatsapp-*.repository.ts
└── presentation/
    ├── controllers/
    │   └── whatsapp.controller.ts
    └── modules/
        └── whatsapp.module.ts
```

### Frontend (React)

```
src/
├── application/
│   └── services/
│       └── WhatsAppService.js
└── components/
    └── whatsapp/
        ├── WhatsAppPanel.jsx
        ├── WhatsAppQrCode.jsx
        ├── WhatsAppMessages.jsx
        └── WhatsAppSettings.jsx
```

### Fluxo de Auto-Reply

```
1. Mensagem recebida no WhatsApp
   ↓
2. WhatsAppService intercepta
   ↓
3. Verificações de segurança (blacklist, rate limit, etc.)
   ↓
4. Salva mensagem no banco
   ↓
5. Busca contexto da conversa (últimas N mensagens)
   ↓
6. Envia para IA (Ollama) com persona e contexto
   ↓
7. IA gera resposta
   ↓
8. Aplica delay humanizado
   ↓
9. Simula "digitando..." (se ativo)
   ↓
10. Envia resposta via WhatsApp
    ↓
11. Salva resposta no banco
    ↓
12. Atualiza status e metadata
```

## 📋 API Endpoints

### POST `/whatsapp/start`
Inicia sessão e gera QR Code

### GET `/whatsapp/status`
Obtém status da conexão

### GET `/whatsapp/qr`
Obtém QR Code atual

### POST `/whatsapp/disconnect`
Desconecta sessão

### POST `/whatsapp/toggle-pause`
Pausa/Retoma auto-reply (Kill Switch)

### POST `/whatsapp/toggle-auto-reply`
Ativa/Desativa auto-reply

### GET `/whatsapp/config`
Obtém configurações

### PUT `/whatsapp/config`
Atualiza configurações

### GET `/whatsapp/messages`
Lista mensagens com paginação

## 🔮 Roadmap (Futuro)

- ✨ Suporte a grupos
- ✨ Suporte a mensagens com mídia
- ✨ Multi-conta (múltiplos WhatsApps)
- ✨ Agendamento de mensagens
- ✨ Respostas condicionais (if/then)
- ✨ Integração com CRM
- ✨ Analytics e relatórios
- ✨ Respostas com templates
- ✨ Webhook para eventos externos

## 📝 Notas Importantes

⚠️ **Disclaimer**: Esta integração usa WhatsApp Web não oficial. Use por sua conta e risco. O WhatsApp pode banir contas que usam automação.

⚠️ **Rate Limits**: Configure limites conservadores para evitar ser detectado como spam.

⚠️ **Teste em conta secundária**: Recomenda-se testar primeiro em uma conta de teste antes de usar em produção.

⚠️ **Backup**: Mantenha backup regular do banco de dados e das sessões.

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique esta documentação
2. Consulte os logs do backend
3. Abra uma issue no repositório GitHub

---

**Desenvolvido com ❤️ para XandAI**
