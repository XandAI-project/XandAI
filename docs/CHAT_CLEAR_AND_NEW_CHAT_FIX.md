# Correção de "New Chat" e "Clear Chat History" - XandAI

## 🎯 Objetivo

Corrigir dois comportamentos problemáticos no sistema de chat:

1. **New Chat**: Não resetava o chat corretamente, agregando mensagens à conversa atual
2. **Clear Chat History**: Não removia mensagens da UI nem do backend

## 🐛 Problemas Identificados

### Problema 1: New Chat
- Clicar em "New Chat" não limpava as mensagens anteriores
- Novas mensagens eram agregadas à conversa existente
- Não havia criação de uma nova conversa isolada

### Problema 2: Clear Chat History
- Botão "Clear Chat History" não tinha funcionalidade real
- Mensagens não eram removidas da UI
- Backend não tinha endpoint para limpar mensagens de uma sessão
- Não havia distinção entre "limpar mensagens" e "deletar conversa"

## ✅ Soluções Implementadas

### 1. Backend - Novo Endpoint para Limpar Mensagens

#### Arquivo: `backend/src/application/use-cases/chat.use-case.ts`

Adicionado método `clearSessionMessages`:

```typescript
/**
 * Limpa todas as mensagens de uma sessão específica (mantém a sessão)
 */
async clearSessionMessages(userId: string, sessionId: string): Promise<void> {
  const belongsToUser = await this.chatSessionRepository.belongsToUser(sessionId, userId);
  
  if (!belongsToUser) {
    throw new ForbiddenException('Acesso negado à sessão');
  }

  this.logger.log(`🧹 Clearing all messages from session: ${sessionId}`);
  await this.chatMessageRepository.deleteBySessionId(sessionId);
  this.logger.log(`✅ All messages cleared from session: ${sessionId}`);
}
```

#### Arquivo: `backend/src/presentation/controllers/chat.controller.ts`

Adicionado endpoint DELETE:

```typescript
/**
 * Limpa todas as mensagens de uma sessão (mantém a sessão)
 */
@Delete('sessions/:sessionId/messages')
@HttpCode(HttpStatus.NO_CONTENT)
async clearSessionMessages(
  @Request() req,
  @Param('sessionId', ParseUUIDPipe) sessionId: string,
): Promise<void> {
  return await this.chatUseCase.clearSessionMessages(req.user.id, sessionId);
}
```

**Endpoint**: `DELETE /api/v1/chat/sessions/:sessionId/messages`

### 2. Frontend - ChatApiRepository

#### Arquivo: `src/infrastructure/api/ChatApiRepository.js`

Adicionado método para chamar o novo endpoint:

```javascript
/**
 * Limpa todas as mensagens de uma sessão específica
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<void>}
 */
async clearSessionMessages(sessionId) {
  try {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}/messages`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Erro ao limpar mensagens: ${response.status}`);
    }

    console.log(`✅ Mensagens da sessão ${sessionId} foram limpas`);
  } catch (error) {
    console.error('Erro ao limpar mensagens da sessão:', error);
    throw error;
  }
}
```

### 3. Frontend - ChatService

#### Arquivo: `src/application/services/ChatService.js`

Adicionado método para expor funcionalidade:

```javascript
/**
 * Limpa todas as mensagens de uma sessão específica
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<void>}
 */
async clearSessionMessages(sessionId) {
  try {
    if (this.chatRepository && typeof this.chatRepository.clearSessionMessages === 'function') {
      await this.chatRepository.clearSessionMessages(sessionId);
      console.log(`✅ Session ${sessionId} messages cleared`);
    } else {
      console.warn('clearSessionMessages not available in repository');
    }
  } catch (error) {
    console.error('Erro ao limpar mensagens da sessão:', error);
    throw new Error('Falha ao limpar mensagens. Tente novamente.');
  }
}
```

### 4. Frontend - ChatContainer

#### Arquivo: `src/components/chat/ChatContainer.jsx`

**Adicionado estado para controlar modo de limpeza:**

```javascript
const [clearMode, setClearMode] = useState('messages'); // 'messages' or 'conversation'
```

**Atualizado handler `handleClearHistory`:**

```javascript
const handleClearHistory = async () => {
  try {
    if (clearMode === 'messages') {
      // Clear only messages, keep the conversation
      if (currentSessionId) {
        console.log('🧹 Clearing messages from conversation:', currentSessionId);
        
        // Call backend to clear messages
        if (chatService && chatService.clearSessionMessages) {
          await chatService.clearSessionMessages(currentSessionId);
        }
        
        // Clear UI messages but keep session active
        loadExternalMessages([], currentSessionId);
        
        // Refresh sessions list to update preview
        await fetchChatSessions();
      } else {
        // No session active, just clear the UI
        loadExternalMessages([], null);
      }
    } else {
      // Delete entire conversation
      if (currentSessionId) {
        console.log('🗑️ Deleting current conversation:', currentSessionId);
        await deleteChatSession(currentSessionId);
        
        // Clear UI
        loadExternalMessages([], null);
        setSession(null);
        
        // Create new session automatically
        if (chatService && chatService.createNewSession) {
          chatService.createNewSession();
        }
        
        // Refresh sessions list
        await fetchChatSessions();
      } else {
        // No session active, just clear the UI
        loadExternalMessages([], null);
      }
    }
    
    setClearDialogOpen(false);
  } catch (err) {
    console.error('Error clearing history:', err);
  }
};
```

**Atualizado diálogo de confirmação:**

```javascript
<Dialog open={clearDialogOpen} onClose={handleClearDialogClose}>
  <DialogTitle>
    {clearMode === 'messages' ? 'Clear Chat History' : 'Delete Conversation'}
  </DialogTitle>
  <DialogContent>
    <Typography variant="body1">
      {clearMode === 'messages' 
        ? 'Are you sure you want to clear all messages from this conversation? The conversation will be kept but all messages will be removed.'
        : 'Are you sure you want to delete this entire conversation? This action cannot be undone.'
      }
    </Typography>
    {messageCount > 0 && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {messageCount} messages will be {clearMode === 'messages' ? 'cleared' : 'permanently deleted'}.
      </Typography>
    )}
  </DialogContent>
  <DialogActions sx={{ p: 2, gap: 1 }}>
    <Button onClick={handleClearDialogClose} color="inherit">
      Cancel
    </Button>
    <Button 
      onClick={handleClearHistory}
      color={clearMode === 'messages' ? 'warning' : 'error'}
      variant="contained"
      startIcon={<DeleteIcon />}
    >
      {clearMode === 'messages' ? 'Clear Messages' : 'Delete Conversation'}
    </Button>
  </DialogActions>
</Dialog>
```

### 5. Frontend - ChatHeader

#### Arquivo: `src/components/chat/ChatHeader.jsx`

**Adicionado menu dropdown com duas opções:**

```javascript
{/* Clear chat button with menu */}
{messageCount > 0 && (
  <Tooltip title="Clear options">
    <IconButton
      color="inherit"
      onClick={handleClearMenuOpen}
      size={isMobile ? 'small' : 'medium'}
    >
      <ClearIcon />
    </IconButton>
  </Tooltip>
)}

{/* Clear menu */}
<Menu
  anchorEl={clearMenuAnchor}
  open={Boolean(clearMenuAnchor)}
  onClose={handleClearMenuClose}
>
  <MenuItem onClick={handleClearMessages}>
    <ListItemIcon>
      <ClearIcon fontSize="small" color="warning" />
    </ListItemIcon>
    <ListItemText 
      primary="Clear Messages"
      secondary="Keep conversation"
    />
  </MenuItem>

  <Divider />

  <MenuItem onClick={handleDeleteConversation}>
    <ListItemIcon>
      <DeleteIcon fontSize="small" color="error" />
    </ListItemIcon>
    <ListItemText 
      primary="Delete Conversation"
      secondary="Remove permanently"
    />
  </MenuItem>
</Menu>
```

### 6. Comportamento do New Chat (Já Corrigido)

O comportamento do "New Chat" já estava correto conforme documentado em `SESSION_MANAGEMENT_FIX.md`:

```javascript
const handleNewChat = async () => {
  try {
    console.log('🆕 Starting new conversation...');
    
    // Clear messages in UI
    loadExternalMessages([], null);
    
    // Reset session ID (new session will be created on first message)
    setSession(null);
    
    // Clear session in chat service/repository
    if (chatService && chatService.createNewSession) {
      chatService.createNewSession();
    }
    
    // Close sidebar
    setSidebarOpen(false);
    
    console.log('✅ New conversation ready');
  } catch (err) {
    console.error('Error creating new conversation:', err);
  }
};
```

## 🧪 Testes Criados

### Backend Tests

**Arquivo**: `backend/src/application/use-cases/chat.use-case.clear-messages.spec.ts`

Testes incluem:
- ✅ Limpar mensagens de uma sessão
- ✅ Verificar permissões de acesso
- ✅ Tratamento de erros
- ✅ Fluxo de integração (limpar + enviar nova mensagem)
- ✅ Manter sessão após limpar mensagens
- ✅ Criar nova sessão sem deletar anteriores
- ✅ Isolamento entre sessões

### Frontend Tests

**Arquivo**: `src/__tests__/integration/chat-clear-messages.test.js`

Testes incluem:
- ✅ Limpar mensagens via API
- ✅ Manter sessão ativa após limpar
- ✅ Enviar novas mensagens após limpar
- ✅ Limpar session ID ao criar novo chat
- ✅ Limpar UI ao criar novo chat
- ✅ Criar nova sessão na primeira mensagem
- ✅ Não deletar sessões anteriores
- ✅ Isolamento entre sessões
- ✅ Tratamento de erros

## 🔄 Fluxos Completos

### Fluxo 1: Clear Messages (Limpar Mensagens)

1. **Usuário clica no botão de limpar** → Abre menu dropdown
2. **Usuário seleciona "Clear Messages"** → Abre diálogo de confirmação
3. **Usuário confirma** → Frontend chama backend
4. **Backend deleta mensagens** → `DELETE /api/v1/chat/sessions/:sessionId/messages`
5. **Frontend atualiza UI** → Mensagens removidas, sessão mantida
6. **Lista de conversas atualizada** → Preview atualizado

### Fluxo 2: Delete Conversation (Deletar Conversa)

1. **Usuário clica no botão de limpar** → Abre menu dropdown
2. **Usuário seleciona "Delete Conversation"** → Abre diálogo de confirmação
3. **Usuário confirma** → Frontend chama backend
4. **Backend deleta sessão** → `DELETE /api/v1/chat/sessions/:sessionId`
5. **Frontend limpa UI** → Mensagens e sessão removidas
6. **Nova sessão criada automaticamente** → Pronto para novo chat
7. **Lista de conversas atualizada** → Conversa removida

### Fluxo 3: New Chat (Nova Conversa)

1. **Usuário clica em "New Chat"** (botão "+")
2. **Frontend limpa mensagens da UI** → `loadExternalMessages([], null)`
3. **Frontend reseta session ID** → `setSession(null)`
4. **Frontend limpa repositório** → `chatService.createNewSession()`
5. **Sidebar fecha** → UI limpa e pronta
6. **Usuário digita primeira mensagem**
7. **Backend cria nova sessão** → Retorna `sessionId`
8. **Frontend sincroniza session ID** → Conversa ativa
9. **Lista de conversas atualizada** → Nova conversa aparece

## 📊 Diferenças Entre Operações

| Operação | Mensagens | Sessão | Backend API | Uso |
|----------|-----------|--------|-------------|-----|
| **Clear Messages** | ❌ Deletadas | ✅ Mantida | `DELETE /sessions/:id/messages` | Limpar histórico mas manter conversa |
| **Delete Conversation** | ❌ Deletadas | ❌ Deletada | `DELETE /sessions/:id` | Remover conversa completamente |
| **New Chat** | ✅ Limpas (UI) | ✅ Nova criada | `POST /messages` (primeira msg) | Iniciar nova conversa |

## 🎨 Melhorias de UX

1. **Menu Dropdown**: Usuário tem opções claras de "Clear Messages" vs "Delete Conversation"
2. **Diálogos Contextuais**: Mensagens diferentes baseadas na ação escolhida
3. **Cores Distintas**: 
   - 🟡 Warning (amarelo) para "Clear Messages"
   - 🔴 Error (vermelho) para "Delete Conversation"
4. **Feedback Visual**: Contador de mensagens que serão afetadas
5. **Descrições Claras**: Subtítulos explicando cada opção

## 🔒 Segurança

- ✅ Verificação de propriedade da sessão no backend
- ✅ Autenticação JWT obrigatória
- ✅ Validação de UUID nos parâmetros
- ✅ Tratamento de erros apropriado
- ✅ Logs para auditoria

## 📝 Comandos para Testar

### Backend Tests

```bash
cd backend
npm test chat.use-case.clear-messages.spec.ts
```

### Frontend Tests

```bash
npm test chat-clear-messages.test.js
```

### Teste Manual

1. **Testar Clear Messages**:
   - Envie algumas mensagens
   - Clique no ícone de limpar no header
   - Selecione "Clear Messages"
   - Confirme
   - Verifique que mensagens foram removidas mas conversa permanece no histórico

2. **Testar Delete Conversation**:
   - Envie algumas mensagens
   - Clique no ícone de limpar no header
   - Selecione "Delete Conversation"
   - Confirme
   - Verifique que conversa foi removida do histórico

3. **Testar New Chat**:
   - Envie algumas mensagens
   - Clique no botão "+" (New Chat)
   - Verifique que UI foi limpa
   - Envie nova mensagem
   - Verifique que nova conversa aparece no histórico
   - Verifique que conversa anterior ainda existe

## ✅ Checklist de Verificação

- [x] Endpoint backend para limpar mensagens criado
- [x] Método no ChatApiRepository implementado
- [x] Método no ChatService implementado
- [x] Handler handleClearHistory atualizado
- [x] Menu dropdown no ChatHeader adicionado
- [x] Diálogo de confirmação atualizado
- [x] Comportamento do New Chat verificado
- [x] Testes backend criados
- [x] Testes frontend criados
- [x] Sem erros de linter
- [x] Documentação completa

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar opção de "Clear All Conversations"
- [ ] Implementar confirmação com checkbox "Don't ask again"
- [ ] Adicionar undo/redo para operações de limpeza
- [ ] Implementar backup automático antes de deletar
- [ ] Adicionar estatísticas de uso (quantas conversas, mensagens, etc.)

## 👨‍💻 Autor

Correções implementadas seguindo princípios de:
- Clean Architecture
- SOLID Principles
- Test-Driven Development (TDD)
- User Experience (UX) Best Practices

---

**Data**: Janeiro 2026  
**Versão**: 1.0.0  
**Status**: ✅ Implementado e Testado

