import { ChatRepository } from '../../domain/repositories/ChatRepository.js';
import { Message } from '../../domain/entities/Message.js';

/**
 * Implementação do ChatRepository que se conecta ao backend
 * @class ChatApiRepository
 * @extends {ChatRepository}
 */
export class ChatApiRepository extends ChatRepository {
  constructor() {
    super();
    // Use relative URL for API - works with nginx proxy
    this.baseURL = '/api/v1';
    this.tokenKey = 'xandai_auth_token';
  }

  /**
   * Gets the auth token from localStorage
   * @returns {string|null}
   */
  getAuthToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Gets auth headers for requests
   * @returns {Object}
   */
  getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Envia uma mensagem para o backend
   * @param {string} message - Mensagem do usuário
   * @param {Function} onToken - Callback para streaming (opcional)
   * @returns {Promise<string>} - Resposta do assistente
   */
  async sendMessage(message, onToken = null) {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Get Ollama config - NOTE: uses same key as OllamaApiRepository ('ollama-config')
      const ollamaConfig = JSON.parse(localStorage.getItem('ollama-config') || '{}');
      
      // Log for debugging
      console.log('🤖 Ollama config from localStorage:', ollamaConfig);
      console.log('🤖 Selected model:', ollamaConfig.selectedModel || 'NOT SET - using default llama3.2');
      
      // Build ollamaConfig to send to backend
      const ollamaConfigForBackend = {
        enabled: ollamaConfig.enabled !== false
      };
      
      // If user configured a baseUrl on frontend, send it to override backend's env var
      if (ollamaConfig.baseUrl) {
        ollamaConfigForBackend.baseUrl = ollamaConfig.baseUrl;
        console.log('🔗 Using frontend-configured Ollama URL:', ollamaConfig.baseUrl);
      }
      
      // Also include timeout if configured
      if (ollamaConfig.timeout) {
        ollamaConfigForBackend.timeout = ollamaConfig.timeout;
      }

      // Use model from config or fallback to default
      const modelToUse = ollamaConfig.selectedModel || 'llama3.2';
      console.log('🚀 Sending message with model:', modelToUse);

      const requestBody = {
        content: message,
        sessionId: this.currentSessionId || null,
        model: modelToUse,
        temperature: 0.7,
        metadata: {
          ollamaConfig: ollamaConfigForBackend
        }
      };

      // Use streaming endpoint if callback provided
      if (onToken) {
        console.log('🌊 Using streaming endpoint...');
        console.log('📝 Current session ID:', this.currentSessionId || 'none (will create new)');
        
        const response = await fetch(`${this.baseURL}/chat/messages/stream`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Erro na requisição: ${response.status}`);
        }

        // Handle SSE streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let attachments = null;
        let sessionId = null;
        let buffer = ''; // Buffer for incomplete chunks

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines from buffer
          const lines = buffer.split('\n');
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  throw new Error(data.error);
                }
                
                // Capture session ID when received
                if (data.sessionId) {
                  sessionId = data.sessionId;
                  this.currentSessionId = sessionId;
                  console.log('📝 Session ID received and stored:', sessionId);
                }
                
                // Handle image generation (non-streamable content)
                if (data.isImageGeneration && data.attachments) {
                  console.log('🎨 Received image generation response');
                  fullResponse = data.fullText || data.token || '';
                  attachments = data.attachments;
                  onToken(data.token || '', fullResponse, false);
                } else if (data.token !== undefined) {
                  fullResponse = data.fullText || (fullResponse + data.token);
                  onToken(data.token, fullResponse, false);
                }
                
                if (data.done) {
                  // Final session ID update - always use backend's session ID as source of truth
                  if (data.sessionId) {
                    this.currentSessionId = data.sessionId;
                    console.log('📝 Final session ID stored:', data.sessionId);
                  }
                  onToken('', fullResponse, true);
                }
              } catch (e) {
                if (e.message && !e.message.includes('JSON') && !e.message.includes('Unexpected')) {
                  throw e;
                }
                // Ignore JSON parsing errors for incomplete chunks
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.token) {
              fullResponse = data.fullText || (fullResponse + data.token);
            }
            if (data.attachments) {
              attachments = data.attachments;
            }
            if (data.sessionId) {
              this.currentSessionId = data.sessionId;
            }
          } catch (e) {
            // Ignore parsing errors on final chunk
          }
        }

        // Return response with attachments if present
        if (attachments && attachments.length > 0) {
          console.log('🎨 Returning response with attachments:', attachments);
          return {
            content: fullResponse,
            attachments: attachments
          };
        }

        return fullResponse;
      } else {
        // Non-streaming: use regular endpoint
        const response = await fetch(`${this.baseURL}/chat/messages`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`Erro na requisição: ${response.status}`);
        }

        const result = await response.json();
        console.log('Backend response:', result);
        
        // Update current session from response
        if (result.session && result.session.id) {
          this.currentSessionId = result.session.id;
        }
        
        // Extract assistant message content and attachments
        const assistantContent = result.assistantMessage?.content || result.content || result.message || 'Resposta recebida';
        const attachments = result.assistantMessage?.attachments || null;
        
        // If there are attachments (like generated images), return an object
        if (attachments && attachments.length > 0) {
          console.log('🎨 Received image attachments:', attachments);
          return {
            content: assistantContent,
            attachments: attachments
          };
        }
        
        return assistantContent;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem para o backend:', error);
      throw error;
    }
  }

  /**
   * Salva uma mensagem no backend
   * @param {Message} message - Mensagem para salvar
   * @returns {Promise<void>}
   */
  async saveMessage(message) {
    try {
      await this.saveMessageWithId(message.id, message.content, message.sender === 'user' ? 'user' : 'assistant');
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      // Não falha se não conseguir salvar
    }
  }

  /**
   * Salva uma mensagem com ID específico no backend
   * @param {string} messageId - ID da mensagem
   * @param {string} content - Conteúdo da mensagem
   * @param {string} role - Role da mensagem (user/assistant)
   * @returns {Promise<void>}
   */
  async saveMessageWithId(messageId, content, role) {
    try {
      const response = await fetch(`${this.baseURL}/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          id: messageId,
          content: content,
          role: role,
          chatSessionId: this.currentSessionId || null
        })
      });

      if (!response.ok && response.status !== 401) {
        console.warn(`Erro ao salvar mensagem: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao salvar mensagem com ID:', error);
      // Don't throw - allow chat to continue even if save fails
    }
  }

  /**
   * Obtém o histórico de mensagens do backend
   * @returns {Promise<Message[]>} - Lista de mensagens
   */
  async getMessageHistory() {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        return []; // Retorna array vazio se não autenticado
      }

      const response = await fetch(`${this.baseURL}/chat/messages/recent`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }

      const data = await response.json();
      const messages = data.messages || [];

      // Converte mensagens do backend para o formato do frontend
      const formattedMessages = messages.map(msg => {
        const message = new Message(
          msg.id,
          msg.content,
          msg.role === 'user' ? 'user' : 'assistant',
          new Date(msg.createdAt)
        );

        // Adiciona anexos se existirem
        if (msg.attachments && Array.isArray(msg.attachments)) {
          message.attachments = msg.attachments.map(att => ({
            type: att.type,
            url: att.url,
            filename: att.filename,
            originalPrompt: att.originalPrompt,
            metadata: att.metadata
          }));
        }

        return message;
      });

      // Ordena mensagens cronologicamente (mais antigas primeiro)
      formattedMessages.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });

      return formattedMessages;
    } catch (error) {
      console.error('Erro ao carregar histórico do backend:', error);
      return []; // Retorna array vazio em caso de erro
    }
  }

  /**
   * Limpa o histórico de mensagens (deleta todas as sessões)
   * @returns {Promise<void>}
   */
  async clearHistory() {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        // Just clear local state if not authenticated
        this.currentSessionId = null;
        return;
      }

      // Get all sessions and delete them
      const response = await fetch(`${this.baseURL}/chat/sessions`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const sessions = data.sessions || data || [];
        
        console.log(`Found ${sessions.length} sessions to delete:`, sessions.map(s => s.id));
        
        // Delete each session
        for (const session of sessions) {
          if (session.id) {
            try {
              const deleteResponse = await fetch(`${this.baseURL}/chat/sessions/${session.id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
              });
              if (deleteResponse.ok || deleteResponse.status === 204) {
                console.log(`✅ Deleted session ${session.id}`);
              } else {
                console.error(`❌ Failed to delete session ${session.id}: ${deleteResponse.status}`);
              }
            } catch (err) {
              console.warn(`Failed to delete session ${session.id}:`, err);
            }
          }
        }
      } else {
        console.error(`Failed to fetch sessions: ${response.status}`);
      }

      // Clear current session ID
      this.currentSessionId = null;
      
      console.log('Histórico limpo - todas as sessões foram deletadas');
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      // Still clear local state even if backend fails
      this.currentSessionId = null;
      throw error;
    }
  }

  /**
   * Define a sessão atual
   * @param {string} sessionId - ID da sessão
   */
  setCurrentSessionId(sessionId) {
    this.currentSessionId = sessionId;
    console.log('📝 Session ID set to:', sessionId);
  }

  /**
   * Limpa a sessão atual (para começar uma nova conversa)
   */
  clearCurrentSessionId() {
    this.currentSessionId = null;
    console.log('🧹 Session ID cleared - ready for new conversation');
  }

  /**
   * Obtém a sessão atual
   * @returns {string|null}
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }

  /**
   * Verifica se o backend está disponível
   * @returns {Promise<boolean>}
   */
  async isBackendAvailable() {
    try {
      const response = await fetch(`${this.baseURL}/auth/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
