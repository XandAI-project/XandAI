/**
 * Generates a proper UUID v4
 * @returns {string} UUID string
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Entidade Message - Representa uma mensagem no chat
 * @class Message
 */
export class Message {
  /**
   * @param {string} id - ID único da mensagem
   * @param {string} content - Conteúdo da mensagem
   * @param {string} sender - Remetente da mensagem ('user' | 'assistant')
   * @param {Date} timestamp - Data e hora da mensagem
   * @param {boolean} isTyping - Indica se está digitando
   * @param {boolean} isStreaming - Indica se está fazendo streaming
   */
  constructor(id, content, sender, timestamp = new Date(), isTyping = false, isStreaming = false) {
    this.id = id;
    this.content = content;
    this.sender = sender;
    this.timestamp = timestamp;
    this.isTyping = isTyping;
    this.isStreaming = isStreaming;
    this.attachments = []; // Anexos da mensagem (imagens, arquivos, etc.)
  }

  /**
   * Verifica se a mensagem é do usuário
   * @returns {boolean}
   */
  isFromUser() {
    return this.sender === 'user';
  }

  /**
   * Verifica se a mensagem é do assistente
   * @returns {boolean}
   */
  isFromAssistant() {
    return this.sender === 'assistant';
  }

  /**
   * Formata a data da mensagem
   * @returns {string}
   */
  getFormattedTime() {
    return this.timestamp.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Adiciona um anexo à mensagem
   * @param {Object} attachment - Objeto do anexo
   */
  addAttachment(attachment) {
    if (!this.attachments) {
      this.attachments = [];
    }
    this.attachments.push(attachment);
  }

  /**
   * Verifica se a mensagem tem anexos
   * @returns {boolean}
   */
  hasAttachments() {
    return this.attachments && this.attachments.length > 0;
  }

  /**
   * Cria uma mensagem de usuário
   * @param {string} content - Conteúdo da mensagem
   * @returns {Message}
   */
  static createUserMessage(content) {
    const id = generateUUID();
    return new Message(id, content, 'user');
  }

  /**
   * Cria uma mensagem do assistente
   * @param {string} content - Conteúdo da mensagem
   * @returns {Message}
   */
  static createAssistantMessage(content) {
    const id = generateUUID();
    return new Message(id, content, 'assistant');
  }

  /**
   * Cria uma mensagem de digitação
   * @returns {Message}
   */
  static createTypingMessage() {
    const id = generateUUID();
    return new Message(id, '', 'assistant', new Date(), true);
  }
}
