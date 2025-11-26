import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '../services/ChatService.js';
import { MockChatRepository } from '../../infrastructure/mock-api/MockChatRepository.js';
import { ChatApiRepository } from '../../infrastructure/api/ChatApiRepository.js';
import { Message } from '../../domain/entities/Message.js';

/**
 * Hook personalizado para gerenciar o estado do chat
 * @returns {Object} - Estado e funções do chat
 */
export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatService, setChatService] = useState(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  /**
   * Initializes chat service based on backend availability
   */
  useEffect(() => {
    const initializeChatService = async () => {
      try {
        const apiRepository = new ChatApiRepository();
        const backendAvailable = await apiRepository.isBackendAvailable();
        
        if (backendAvailable) {
          console.log('✅ Backend available - using ChatApiRepository');
          setChatService(new ChatService(apiRepository));
          setIsBackendConnected(true);
        } else {
          console.log('⚠️ Backend unavailable - using MockChatRepository');
          setChatService(new ChatService(new MockChatRepository()));
          setIsBackendConnected(false);
        }
      } catch (error) {
        console.error('Error initializing chat service:', error);
        // Fallback to mock in case of error
        setChatService(new ChatService(new MockChatRepository()));
        setIsBackendConnected(false);
      }
    };

    initializeChatService();
  }, []);

  /**
   * Loads message history when service is ready
   */
  useEffect(() => {
    if (!chatService) return;

    const loadHistory = async () => {
      try {
        const history = await chatService.getMessageHistory();
        setMessages(history);
      } catch (err) {
        console.error('Error loading history:', err);
        setError('Failed to load message history');
      }
    };

    loadHistory();
  }, [chatService]);

  /**
   * Sends message using local flow (frontend) as fallback
   */
  const sendMessageLocally = useCallback(async (messageContent, existingAssistantId = null) => {
    try {
      let assistantMessageId = existingAssistantId;
      
      if (!assistantMessageId) {
        // Add user message immediately
        const userMessage = Message.createUserMessage(messageContent);
        setMessages(prev => [...prev, userMessage]);

        // Create empty response message for streaming
        assistantMessageId = `msg_${Date.now()}_assistant`;
        const streamingMessage = Message.createAssistantMessage('');
        streamingMessage.id = assistantMessageId;
        streamingMessage.isStreaming = true;
        
        setMessages(prev => [...prev, streamingMessage]);
      }

      // Callback para streaming de tokens
      const onToken = (token, fullText, isDone) => {
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === assistantMessageId) {
              // Mantém a instância da classe Message, mas atualiza propriedades
              msg.content = fullText;
              msg.isStreaming = !isDone;
              return msg;
            }
            return msg;
          })
        );
      };

      // Send message with streaming
      const response = await chatService.sendMessageWithoutUserSave(messageContent, onToken);

      // Update final assistant message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? response.assistantMessage
            : msg
        )
      );

    } catch (error) {
      console.error('Erro no fluxo local:', error);
      throw error;
    }
  }, [chatService]);

  /**
   * Sends a new message
   * @param {string} messageContent - Message content
   */
  const sendMessage = useCallback(async (messageContent) => {
    if (!messageContent.trim() || !chatService) return;

    setIsLoading(true);
    setError(null);

    try {
      // Adiciona a mensagem do usuário imediatamente
      const userMessage = Message.createUserMessage(messageContent);
      setMessages(prev => [...prev, userMessage]);

      // Salva a mensagem do usuário no backend
      if (isBackendConnected && chatService?.chatRepository?.saveMessageWithId) {
        try {
          await chatService.chatRepository.saveMessageWithId(userMessage.id, userMessage.content, 'user');
        } catch (error) {
          console.warn('Erro ao salvar mensagem do usuário no backend:', error);
        }
      }

      // Cria mensagem de resposta vazia para streaming
      const assistantMessageId = `msg_${Date.now()}_assistant`;
      const streamingMessage = Message.createAssistantMessage('');
      streamingMessage.id = assistantMessageId;
      streamingMessage.isStreaming = true;
      
      setMessages(prev => [...prev, streamingMessage]);

      // Callback para streaming de tokens
      const onToken = (token, fullText, isDone) => {
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === assistantMessageId) {
              // Mantém a instância da classe Message, mas atualiza propriedades
              msg.content = fullText;
              msg.isStreaming = !isDone;
              return msg;
            }
            return msg;
          })
        );
      };

      // Se há uma sessão ativa, busca o histórico para contexto
      let contextualMessage = messageContent;
      if (currentSessionId) {
        try {
          const chatHistoryService = await import('../../services/ChatHistoryService.js');
          const sessionMessages = await chatHistoryService.default.getSessionMessages(currentSessionId);
          
          // Monta contexto com as últimas 10 mensagens
          if (sessionMessages && sessionMessages.length > 0) {
            const recentMessages = sessionMessages.slice(-10);
            let context = '';
            
            recentMessages.forEach(msg => {
              if (msg.role === 'user') {
                context += `Usuário: ${msg.content}\n\n`;
              } else {
                context += `Resposta: ${msg.content}\n\n`;
              }
            });
            
            contextualMessage = `${context}Usuário: ${messageContent}\n\nPor favor, responda diretamente sem prefixos:`;
          }
        } catch (contextError) {
          console.warn('Error fetching context, using simple message:', contextError);
          // Continue with simple message if can't fetch context
        }
      }

      // ALWAYS use frontend streaming for better UX, but with context if available
      const response = await chatService.sendMessageWithoutUserSave(contextualMessage, onToken);

      // Update final assistant message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? response.assistantMessage
            : msg
        )
      );

      // Save assistant message to backend
      if (isBackendConnected && chatService?.chatRepository?.saveMessageWithId) {
        try {
          await chatService.chatRepository.saveMessageWithId(
            assistantMessageId, 
            response.assistantMessage.content, 
            'assistant'
          );
        } catch (error) {
          console.warn('Error saving assistant message to backend:', error);
        }
      }

      // If there's an active session, save to backend AFTER streaming
      if (currentSessionId) {
        try {
          const chatHistoryService = await import('../../services/ChatHistoryService.js');
          
          // Save user message
          await chatHistoryService.default.sendMessage(currentSessionId, messageContent, 'user');
          
          // Save assistant response
          await chatHistoryService.default.sendMessage(currentSessionId, response.assistantMessage.content, 'assistant');

        } catch (backendError) {
          console.error('Error saving messages to backend:', backendError);
          // Don't interrupt flow - streaming already worked
        }
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      
      // Remove streaming message in case of error
      setMessages(prev => prev.filter(msg => !msg.isStreaming));
    } finally {
      setIsLoading(false);
    }
  }, [chatService, currentSessionId, sendMessageLocally]);

  /**
   * Clears all message history
   */
  const clearHistory = useCallback(async () => {
    try {
      await chatService.clearHistory();
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Error clearing history:', err);
      setError(err.message || 'Failed to clear history');
    }
  }, [chatService]);

  /**
   * Clears current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Creates a new chat session
   */
  const startNewSession = useCallback(() => {
    chatService.createNewSession();
    setMessages([]);
    setError(null);
  }, [chatService]);

  /**
   * Checks if there's a message being typed
   */
  const isTyping = messages.some(msg => msg.isTyping);

  /**
   * Gets message count
   */
  const messageCount = messages.filter(msg => !msg.isTyping).length;

  /**
   * Checks if there are messages in chat
   */
  const hasMessages = messageCount > 0;

  /**
   * Forces a new ChatService instance (useful when configuration changes)
   */
  const refreshChatService = useCallback(() => {
    // Force service recreation
    window.location.reload();
  }, []);

  /**
   * Loads external messages (from a backend session)
   * @param {Array} externalMessages - Session messages
   * @param {string} sessionId - Session ID
   */
  const loadExternalMessages = useCallback((externalMessages, sessionId = null) => {
    if (!Array.isArray(externalMessages)) {
      console.warn('loadExternalMessages: externalMessages must be an array');
      return;
    }

    // Set current session
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }

    // Convert backend messages to frontend format
    const formattedMessages = externalMessages.map(msg => {
      const sender = msg.role === 'user' ? 'user' : 'assistant';
      const timestamp = msg.createdAt ? new Date(msg.createdAt) : new Date();
      
      const message = new Message(
        msg.id || `msg_${Date.now()}_${Math.random()}`,
        msg.content || '',
        sender,
        timestamp,
        false, // isTyping
        false  // isStreaming
      );
      
      // Add attachments if they exist
      if (msg.attachments && Array.isArray(msg.attachments)) {
        console.log('Adding attachments to message:', msg.id, msg.attachments);
        message.attachments = msg.attachments;
      }
      
      return message;
    });

    setMessages(formattedMessages);
    setError(null);
  }, []);

  /**
   * Sets current session
   * @param {string} sessionId - Session ID
   */
  const setSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
  }, []);

  /**
   * Updates attachments of a specific message
   * @param {string} messageId - Message ID
   * @param {Object} attachment - Attachment to be added
   */
  const updateMessageAttachment = useCallback((messageId, attachment) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        // Create a copy of the message and add the attachment
        const updatedMsg = Object.assign(Object.create(Object.getPrototypeOf(msg)), msg);
        if (!updatedMsg.attachments) {
          updatedMsg.attachments = [];
        }
        updatedMsg.attachments = [...updatedMsg.attachments, attachment];
        return updatedMsg;
      }
      return msg;
    }));
  }, []);

  return {
    // Estado
    messages: messages.filter(msg => !msg.isTyping), // Filtra mensagens de digitação para a UI
    isLoading,
    isTyping,
    error,
    hasMessages,
    messageCount,
    isBackendConnected,

    // Ações
    sendMessage,
    clearHistory,
    clearError,
    startNewSession,
    refreshChatService,
    loadExternalMessages,
    setSession,
    updateMessageAttachment,

    // Utilitários
    chatService,
    currentSessionId
  };
};
