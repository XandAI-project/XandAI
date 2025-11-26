import { useState, useEffect, useCallback } from 'react';
import chatHistoryService from '../../services/ChatHistoryService';

/**
 * Hook personalizado para gerenciar histórico de conversas
 * @returns {Object} Estado e funções do histórico
 */
export const useChatHistory = () => {
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches all user sessions
   */
  const fetchChatSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sessions = await chatHistoryService.getChatSessions();
      setChatSessions(Array.isArray(sessions) ? sessions : []);
    } catch (err) {
      console.error('Erro ao buscar sessões:', err);
      setError(err.message || 'Erro ao carregar histórico');
      setChatSessions([]); // Garante que sempre temos um array
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Carrega uma sessão específica
   * @param {string} sessionId - ID da sessão
   */
  const loadChatSession = useCallback(async (sessionId) => {
    try {
      setIsLoadingSession(true);
      setError(null);
      
      const session = await chatHistoryService.getChatSession(sessionId);
      setCurrentSession(session);
      
      return session;
    } catch (err) {
      console.error('Erro ao carregar sessão:', err);
      setError(err.message || 'Erro ao carregar conversa');
      return null;
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  /**
   * Cria uma nova sessão
   * @param {string} title - Título opcional
   */
  const createNewSession = useCallback(async (title = null) => {
    try {
      setIsLoading(true);
      setError(null);
      

      const newSession = await chatHistoryService.createChatSession(title);

      
      // Adiciona a nova sessão ao início da lista
      setChatSessions(prevSessions => [newSession, ...prevSessions]);
      setCurrentSession(newSession);
      
      return newSession;
    } catch (err) {
      console.error('Erro ao criar sessão:', err);
      setError(err.message || 'Erro ao criar nova conversa');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Atualiza o título de uma sessão
   * @param {string} sessionId - ID da sessão
   * @param {string} newTitle - Novo título
   */
  const updateSessionTitle = useCallback(async (sessionId, newTitle) => {
    try {
      await chatHistoryService.updateSessionTitle(sessionId, newTitle);
      
      // Atualiza a sessão na lista
      setChatSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === sessionId ? { ...session, title: newTitle } : session
        )
      );

      // Atualiza a sessão atual se for a mesma
      if (currentSession && currentSession.id === sessionId) {
        setCurrentSession(prev => ({ ...prev, title: newTitle }));
      }
    } catch (err) {
      console.error('Erro ao atualizar título:', err);
      setError(err.message || 'Erro ao atualizar título');
      throw err;
    }
  }, [currentSession]);

  /**
   * Exclui uma sessão
   * @param {string} sessionId - ID da sessão
   */
  const deleteChatSession = useCallback(async (sessionId) => {
    try {
      await chatHistoryService.deleteChatSession(sessionId);
      
      // Remove a sessão da lista
      setChatSessions(prevSessions =>
        prevSessions.filter(session => session.id !== sessionId)
      );

      // Se a sessão excluída era a atual, limpa a sessão atual
      if (currentSession && currentSession.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error('Erro ao excluir sessão:', err);
      setError(err.message || 'Erro ao excluir conversa');
      throw err;
    }
  }, [currentSession]);

  /**
   * Busca sessões com filtro
   * @param {string} query - Termo de pesquisa
   */
  const searchChatSessions = useCallback(async (query) => {
    if (!query || query.trim() === '') {
      // Se não há query, carrega todas as sessões
      await fetchChatSessions();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const filteredSessions = await chatHistoryService.searchChatSessions(query);
      setChatSessions(filteredSessions);
    } catch (err) {
      console.error('Erro ao buscar sessões:', err);
      setError(err.message || 'Erro ao buscar conversas');
    } finally {
      setIsLoading(false);
    }
  }, [fetchChatSessions]);

  /**
   * Envia uma mensagem para a sessão atual
   * @param {string} content - Conteúdo da mensagem
   * @param {string} role - Role da mensagem
   */
  const sendMessageToSession = useCallback(async (content, role = 'user') => {
    if (!currentSession) {
      throw new Error('Nenhuma sessão ativa');
    }

    try {
      const message = await chatHistoryService.sendMessage(currentSession.id, content, role);
      
      // Atualiza a sessão atual com a nova mensagem
      setCurrentSession(prev => ({
        ...prev,
        messages: [...(prev.messages || []), message],
        updatedAt: new Date()
      }));

      // Atualiza a sessão na lista também
      setChatSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === currentSession.id
            ? {
                ...session,
                preview: content.substring(0, 100),
                updatedAt: new Date(),
                messageCount: (session.messageCount || 0) + 1
              }
            : session
        )
      );

      return message;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError(err.message || 'Erro ao enviar mensagem');
      throw err;
    }
  }, [currentSession]);

  /**
   * Limpa o erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Limpa a sessão atual
   */
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
  }, []);

  // Carrega as sessões na inicialização
  useEffect(() => {
    fetchChatSessions();
  }, [fetchChatSessions]);

  return {
    // Estado
    chatSessions,
    currentSession,
    isLoading,
    isLoadingSession,
    error,

    // Ações
    fetchChatSessions,
    loadChatSession,
    createNewSession,
    updateSessionTitle,
    deleteChatSession,
    searchChatSessions,
    sendMessageToSession,
    clearError,
    clearCurrentSession,

    // Computadas
    hasError: !!error,
    hasSessions: chatSessions.length > 0,
    currentSessionId: currentSession?.id || null,
  };
};
