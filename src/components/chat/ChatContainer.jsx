import React, { useState } from 'react';
import {
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import ChatHeader from './ChatHeader';
import ChatSidebar from './ChatSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SettingsDialog from '../settings/SettingsDialog';
import { useChat } from '../../application/hooks/useChat';
import { useChatHistory } from '../../application/hooks/useChatHistory';

/**
 * Main chat container
 * @returns {JSX.Element}
 */
const ChatContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    messages,
    isLoading,
    isTyping,
    error,
    hasMessages,
    messageCount,
    sendMessage,
    clearHistory,
    clearError,
    loadExternalMessages,
    setSession,
    currentSessionId: chatCurrentSessionId,
    updateMessageAttachment,
    chatService
  } = useChat();

  // Hook to manage conversation history
  const {
    chatSessions,
    currentSession,
    isLoading: isLoadingHistory,
    isLoadingSession,
    error: historyError,
    loadChatSession,
    createNewSession,
    updateSessionTitle,
    deleteChatSession,
    searchChatSessions,
    clearError: clearHistoryError,
    currentSessionId,
    hasSessions,
    fetchChatSessions
  } = useChatHistory();

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Handles message sending
   * @param {string} message - Message to be sent
   */
  const handleSendMessage = async (message) => {
    try {
      // Let the backend create the session - it will return the sessionId
      // which gets synced back to useChat via ChatApiRepository
      await sendMessage(message);
      
      // Refresh sessions to get the new one created by backend
      setTimeout(() => {
        fetchChatSessions();
      }, 500);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  /**
   * Handles current conversation deletion
   */
  const handleClearHistory = async () => {
    try {
      // If there's a current session, delete it
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
      
      setClearDialogOpen(false);
    } catch (err) {
      console.error('Error clearing conversation:', err);
    }
  };

  /**
   * Handles confirmation dialog opening
   */
  const handleClearDialogOpen = () => {
    setClearDialogOpen(true);
  };

  /**
   * Handles confirmation dialog closing
   */
  const handleClearDialogClose = () => {
    setClearDialogOpen(false);
  };

  /**
   * Handles chat updates
   */
  const handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Handles error closing
   */
  const handleCloseError = () => {
    clearError();
  };

  /**
   * Handles settings opening
   */
  const handleOpenSettings = () => {
    setSettingsDialogOpen(true);
  };

  /**
   * Handles settings closing
   */
  const handleCloseSettings = () => {
    setSettingsDialogOpen(false);
  };

  /**
   * Handles sidebar opening/closing
   */
  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  /**
   * Handles sidebar closing
   */
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  /**
   * Handles starting a new conversation
   */
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

  /**
   * Handles selection of a conversation from history
   */
  const handleSelectChat = async (chat) => {
    try {

      const session = await loadChatSession(chat.id);

      
      if (session) {
        // Set current session in useChat
        setSession(session.id);
        
        if (session.messages && session.messages.length > 0) {
          // Load session messages into current chat

          loadExternalMessages(session.messages, session.id);

        } else {
          // Session without messages, just clear chat and set session
          loadExternalMessages([], session.id);

        }
      } else {

      }
      setSidebarOpen(false);
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  /**
   * Handles conversation search
   */
  const handleSearchChats = async (query) => {
    try {
      await searchChatSessions(query);
    } catch (err) {
      console.error('Error searching conversations:', err);
    }
  };

  /**
   * Handles image generation
   */
  const handleImageGenerated = (messageId, attachment) => {
    if (updateMessageAttachment) {
      updateMessageAttachment(messageId, attachment);
    }
  };

  /**
   * Handles title editing
   */
  const handleEditTitle = async (sessionId, newTitle) => {
    try {
      await updateSessionTitle(sessionId, newTitle);
    } catch (err) {
      console.error('Error editing title:', err);
    }
  };

  /**
   * Handles conversation deletion from sidebar
   */
  const handleDeleteChat = async (sessionId) => {
    try {
      console.log('🗑️ Deleting conversation from sidebar:', sessionId);
      await deleteChatSession(sessionId);
      
      // If deleted session was the current one, clear UI and start new
      if (currentSessionId === sessionId) {
        loadExternalMessages([], null);
        setSession(null);
        
        // Create new session
        if (chatService && chatService.createNewSession) {
          chatService.createNewSession();
        }
      }
      
      // Refresh sessions list
      await fetchChatSessions();
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  /**
   * Handles history errors
   */
  const handleCloseHistoryError = () => {
    clearHistoryError();
  };

  // Main container style
  const containerStyle = {
    height: '100vh',
    display: 'flex',
    backgroundColor: theme.palette.background.default,
    overflow: 'hidden',
  };

  // Chat area style (main)
  const chatAreaStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    marginLeft: sidebarOpen && !isMobile ? '320px' : 0,
    transition: 'margin-left 0.3s ease-in-out',
  };

  // Main paper style (no border radius)
  const paperStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 0, // Removido border radius
    overflow: 'hidden',
    boxShadow: 'none', // Removido shadow
    backgroundColor: theme.palette.background.paper,
  };

  // Messages area style
  const messagesAreaStyle = {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <Box sx={containerStyle}>
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        onNewChat={handleNewChat}
        chatHistory={chatSessions}
        onSelectChat={handleSelectChat}
        onSearchChats={handleSearchChats}
        onEditTitle={handleEditTitle}
        onDeleteChat={handleDeleteChat}
        currentChatId={currentSessionId}
        isLoading={isLoadingHistory}
        isLoadingSession={isLoadingSession}
      />

      {/* Main chat area */}
      <Box sx={chatAreaStyle}>
        <Paper sx={paperStyle} elevation={0}>
          {/* Cabeçalho do chat */}
          <ChatHeader
            onMenuClick={handleToggleSidebar}
            onClearChat={handleClearDialogOpen}
            onRefresh={handleRefresh}
            onSettings={handleOpenSettings}
            messageCount={messageCount}
            isTyping={isTyping}
          />

          {/* Messages area */}
          <Box sx={messagesAreaStyle}>
            <MessageList
              messages={messages}
              isLoading={isLoading}
              isTyping={isTyping}
              onImageGenerated={handleImageGenerated}
            />
          </Box>

          {/* Message input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            isLoading={isLoading}
            placeholder={
              hasMessages 
                ? "Type your message..." 
                : "Hello! How can I help you today?"
            }
          />
        </Paper>
      </Box>

      {/* Confirmation dialog to delete current conversation */}
      <Dialog
        open={clearDialogOpen}
        onClose={handleClearDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Delete Conversation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this conversation? 
            This action cannot be undone.
          </Typography>
          {messageCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {messageCount} messages will be permanently deleted.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleClearDialogClose}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClearHistory}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={handleCloseSettings}
      />

      {/* Snackbar for errors */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Snackbar for history errors */}
      <Snackbar
        open={!!historyError}
        autoHideDuration={6000}
        onClose={handleCloseHistoryError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseHistoryError} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {historyError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatContainer;
