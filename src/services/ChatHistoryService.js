import authService from './AuthService';

/**
 * Serviço para gerenciar histórico de conversas
 */
class ChatHistoryService {
  constructor() {
    // Use environment variable for API URL - supports network access
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.baseURL = `${API_BASE}/api/v1`;
    
    // Log API URL in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📜 Chat History Service API URL:', this.baseURL);
    }
  }

  /**
   * Busca todas as sessões de chat do usuário
   * @returns {Promise<Array>} Lista de sessões de chat
   */
  async getChatSessions() {
    try {
      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar sessões de chat');
      }

      const data = await response.json();
      
      // Garante que data é um array
      const sessions = Array.isArray(data) ? data : (data.sessions || []);
      
      return sessions.map(session => {
        return {
          id: session.id,
          title: session.title || this.generateTitleFromMessages(session.messages),
          preview: this.generatePreview(session.messages),
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messageCount: session.messages?.length || 0,
          messages: session.messages || []
        };
      });
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      // Retorna array vazio em caso de erro para evitar quebra da UI
      return [];
    }
  }

  /**
   * Busca uma sessão específica com todas as mensagens
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<Object>} Dados da sessão
   */
  async getChatSession(sessionId) {
    try {
      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar sessão');
      }

      const session = await response.json();
      return {
        id: session.id,
        title: session.title || this.generateTitleFromMessages(session.messages),
        messages: this.formatMessages(session.messages || []),
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      };
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova sessão de chat
   * @param {string} title - Título da sessão (opcional)
   * @returns {Promise<Object>} Nova sessão criada
   */
  async createChatSession(title = null) {
    try {


      
      const body = title ? { title } : {};
      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions`, {
        method: 'POST',
        body: JSON.stringify(body),
      });




      if (!response.ok) {
        const errorText = await response.text();
        console.error('ChatHistoryService: Error response:', errorText);
        throw new Error(`Erro ao criar sessão: ${response.status} - ${errorText}`);
      }

      const session = await response.json();

      
      return {
        id: session.id,
        title: session.title,
        messages: [],
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      };
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  /**
   * Atualiza o título de uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} title - Novo título
   * @returns {Promise<Object>} Sessão atualizada
   */
  async updateSessionTitle(sessionId, title) {
    try {
      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar título');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar título:', error);
      throw error;
    }
  }

  /**
   * Exclui uma sessão de chat
   * @param {string} sessionId - ID da sessão
   * @returns {Promise<void>}
   */
  async deleteChatSession(sessionId) {
    try {
      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir sessão');
      }
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem com IA para uma sessão (incluindo histórico de contexto)
   * @param {string} sessionId - ID da sessão
   * @param {string} content - Conteúdo da mensagem do usuário
   * @param {string} model - Modelo a usar (opcional)
   * @param {number} temperature - Temperatura (opcional)
   * @param {Object} ollamaConfig - Configuração do Ollama (opcional)
   * @returns {Promise<Object>} Resposta com mensagem do usuário e do assistente
   */
  async sendMessageWithAI(sessionId, content, model = null, temperature = null, ollamaConfig = null) {
    try {
      const body = { content };
      if (model) body.model = model;
      if (temperature !== null) body.temperature = temperature;
      if (ollamaConfig) body.ollamaConfig = ollamaConfig;

      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions/${sessionId}/send`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem com IA');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar mensagem com IA:', error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem para uma sessão (apenas salva, sem IA)
   * @param {string} sessionId - ID da sessão
   * @param {string} content - Conteúdo da mensagem
   * @param {string} role - Role da mensagem (user/assistant)
   * @returns {Promise<Object>} Mensagem criada
   */
  async sendMessage(sessionId, content, role = 'user') {
    try {
      const response = await authService.authenticatedFetch(`${this.baseURL}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, role }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  /**
   * Busca mensagens de uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {Object} options - Opções de paginação
   * @returns {Promise<Array>} Lista de mensagens
   */
  async getSessionMessages(sessionId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await authService.authenticatedFetch(
        `${this.baseURL}/chat/sessions/${sessionId}/messages?${params}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }
  }

  /**
   * Busca conversas com filtro de pesquisa
   * @param {string} query - Termo de pesquisa
   * @param {Object} options - Opções de busca
   * @returns {Promise<Array>} Lista de sessões filtradas
   */
  async searchChatSessions(query, options = {}) {
    try {
      const params = new URLSearchParams();
      params.append('search', query);
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);

      const response = await authService.authenticatedFetch(
        `${this.baseURL}/chat/sessions/search?${params}`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar conversas');
      }

      const data = await response.json();
      
      // Garante que data é um array
      const sessions = Array.isArray(data) ? data : (data.sessions || []);
      
      return sessions.map(session => ({
        id: session.id,
        title: session.title || this.generateTitleFromMessages(session.messages),
        preview: this.generatePreview(session.messages),
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messageCount: session.messages?.length || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      // Retorna array vazio em caso de erro para evitar quebra da UI
      return [];
    }
  }

  /**
   * Gera um título baseado nas mensagens da sessão
   * @param {Array} messages - Lista de mensagens
   * @returns {string} Título gerado
   * @private
   */
  generateTitleFromMessages(messages) {
    if (!messages || messages.length === 0) {
      return 'Nova conversa';
    }

    // Pega a primeira mensagem do usuário
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      // Trunca para máximo 50 caracteres
      const title = firstUserMessage.content.substring(0, 50);
      return title.length < firstUserMessage.content.length ? `${title}...` : title;
    }

    return 'Nova conversa';
  }

  /**
   * Gera uma prévia da conversa
   * @param {Array} messages - Lista de mensagens
   * @returns {string} Prévia gerada
   * @private
   */
  generatePreview(messages) {
    if (!messages || messages.length === 0) {
      return 'Nenhuma mensagem';
    }

    // Pega a última mensagem
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      // Trunca para máximo 100 caracteres
      const preview = lastMessage.content.substring(0, 100);
      return preview.length < lastMessage.content.length ? `${preview}...` : preview;
    }

    return 'Sem prévia disponível';
  }

  /**
   * Formata mensagens para o formato esperado pelo frontend
   * @param {Array} messages - Mensagens do backend
   * @returns {Array} Mensagens formatadas
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isUser: msg.role === 'user',
      timestamp: new Date(msg.createdAt),
      role: msg.role
    }));
  }
}

// Exporta uma instância singleton
const chatHistoryService = new ChatHistoryService();
export default chatHistoryService;
