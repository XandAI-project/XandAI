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

      const response = await fetch(`${this.baseURL}/chat/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          content: message,
          streaming: !!onToken
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      if (onToken) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullResponse += data.token;
                  onToken(data.token, fullResponse, false);
                } else if (data.done) {
                  onToken('', fullResponse, true);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }

        return fullResponse;
      } else {
        const result = await response.json();
        return result.content || result.message || 'Resposta recebida';
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
