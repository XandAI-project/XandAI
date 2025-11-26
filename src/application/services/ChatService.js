import { Message } from '../../domain/entities/Message.js';
import { ChatSession } from '../../domain/entities/ChatSession.js';
import { OllamaService } from './OllamaService.js';

/**
 * Serviço de Chat - Coordena as operações de chat
 * @class ChatService
 */
export class ChatService {
  /**
   * @param {ChatRepository} chatRepository - Repositório de chat
   */
  constructor(chatRepository) {
    this.chatRepository = chatRepository;
    this.currentSession = ChatSession.createNew();
    this.ollamaService = new OllamaService();
  }

  /**
   * Sends a user message and gets the assistant's response
   * @param {string} messageContent - Message content
   * @param {Function} onToken - Callback for token streaming (optional)
   * @returns {Promise<{userMessage: Message, assistantMessage: Message}>}
   */
  async sendMessage(messageContent, onToken = null) {
    try {
      // Creates the user message
      const userMessage = Message.createUserMessage(messageContent);
      
      // Adiciona à sessão
      this.currentSession.addMessage(userMessage);

      // ALWAYS use backend API - it handles Ollama communication AND image generation detection
      // The backend will process the message, detect if it's an image request, and respond accordingly
      console.log('Enviando mensagem para o backend (com detecção de imagem)...');
      const assistantResponse = await this.chatRepository.sendMessage(messageContent, onToken);
      
      // Cria a mensagem do assistente
      const assistantMessage = Message.createAssistantMessage(assistantResponse);
      
      // Adiciona à sessão
      this.currentSession.addMessage(assistantMessage);

      return {
        userMessage,
        assistantMessage
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw new Error('Falha ao enviar mensagem. Tente novamente.');
    }
  }

  /**
   * Envia uma mensagem sem salvar a mensagem do usuário (para uso com streaming UI)
   * @param {string} messageContent - Conteúdo da mensagem
   * @param {Function} onToken - Callback para streaming de tokens (opcional)
   * @returns {Promise<{assistantMessage: Message}>}
   */
  async sendMessageWithoutUserSave(messageContent, onToken = null) {
    try {
      // ALWAYS use backend API - it handles Ollama communication AND image generation detection
      // The backend will process the message, detect if it's an image request, and respond accordingly
      console.log('Enviando mensagem para o backend (com detecção de imagem)...');
      const assistantResponse = await this.chatRepository.sendMessage(messageContent, onToken);
      console.log('Resposta do backend recebida');
      
      // Cria a mensagem do assistente
      const assistantMessage = Message.createAssistantMessage(assistantResponse);

      return {
        assistantMessage
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw new Error('Falha ao enviar mensagem. Tente novamente.');
    }
  }

  /**
   * Obtém o histórico de mensagens
   * @returns {Promise<Message[]>}
   */
  async getMessageHistory() {
    try {
      const messages = await this.chatRepository.getMessageHistory();
      this.currentSession.messages = messages;
      return messages;
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      return [];
    }
  }

  /**
   * Limpa o histórico de mensagens
   * @returns {Promise<void>}
   */
  async clearHistory() {
    try {
      await this.chatRepository.clearHistory();
      this.currentSession.clearMessages();
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      throw new Error('Falha ao limpar histórico. Tente novamente.');
    }
  }

  /**
   * Obtém a sessão atual
   * @returns {ChatSession}
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Obtém a última mensagem da sessão
   * @returns {Message|null}
   */
  getLastMessage() {
    return this.currentSession.getLastMessage();
  }

  /**
   * Verifica se há mensagens na sessão
   * @returns {boolean}
   */
  hasMessages() {
    return this.currentSession.hasMessages();
  }

  /**
   * Cria uma nova sessão
   * @returns {void}
   */
  createNewSession() {
    this.currentSession = ChatSession.createNew();
  }
}
