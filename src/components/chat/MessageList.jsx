import React, { useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Fade,
  Paper
} from '@mui/material';
import {
  ChatBubbleOutline as ChatIcon,
  Lightbulb as TipIcon
} from '@mui/icons-material';
import ChatMessage from './ChatMessage';

/**
 * Component to display the chat message list
 * @param {Object} props - Component properties
 * @param {Message[]} props.messages - Messages array
 * @param {boolean} props.isLoading - Whether it's loading
 * @param {boolean} props.isTyping - Whether it's typing
 * @returns {JSX.Element}
 */
const MessageList = ({ messages = [], isLoading = false, isTyping = false, onImageGenerated }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  /**
   * Auto scroll to the last message
   */
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // Effect for auto scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  /**
   * Checks whether to show avatar based on the previous message
   * @param {number} index - Current message index
   * @returns {boolean}
   */
  const shouldShowAvatar = (index) => {
    if (index === 0) return true;
    
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    
    return currentMessage.sender !== previousMessage.sender;
  };

  /**
   * Checks whether to show date divider
   * @param {number} index - Current message index
   * @returns {boolean}
   */
  const shouldShowDateDivider = (index) => {
    if (index === 0) return true;
    
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    
    const currentDate = new Date(currentMessage.timestamp).toDateString();
    const previousDate = new Date(previousMessage.timestamp).toDateString();
    
    return currentDate !== previousDate;
  };

  /**
   * Formats the date for the divider
   * @param {Date} date - Date to be formatted
   * @returns {string}
   */
  const formatDateDivider = (date) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const messageDate = new Date(date).toDateString();
    
    if (messageDate === today) return 'Today';
    if (messageDate === yesterday) return 'Yesterday';
    
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Welcome component when there are no messages
  const WelcomeMessage = () => (
    <Fade in={true} timeout={800}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        p: 4,
        gap: 3
      }}>
        {/* Main logo/icon */}
        <Paper
          sx={{
            p: 3,
            borderRadius: '50%',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            boxShadow: theme.shadows[3],
          }}
        >
          <ChatIcon sx={{ fontSize: 48 }} />
        </Paper>

        {/* Welcome title */}
        <Box>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 1
            }}
          >
            Hello! I'm XandAI 👋
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 400 }}
          >
            Your intelligent virtual assistant. I'm here to help you with your questions, 
            conversations and much more!
          </Typography>
        </Box>

        {/* Usage tips */}
        <Paper 
          sx={{ 
            p: 2, 
            backgroundColor: theme.palette.background.default,
            borderRadius: 2,
            maxWidth: 400,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TipIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={500}>
              Tips to get started:
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            • Ask any question and I'll try to help<br/>
            • Talk about your interests<br/>
            • Ask for help with programming or technology<br/>
            • Use natural language, be yourself!
          </Typography>
        </Paper>
      </Box>
    </Fade>
  );

  // Date divider component
  const DateDivider = ({ date }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      my: 2,
      px: isMobile ? 1 : 2
    }}>
      <Divider sx={{ flex: 1 }} />
      <Typography 
        variant="caption" 
        sx={{ 
          mx: 2, 
          px: 1.5,
          py: 0.5,
          backgroundColor: theme.palette.background.default,
          borderRadius: 1,
          color: theme.palette.text.secondary,
          fontSize: '0.75rem',
          fontWeight: 500
        }}
      >
        {formatDateDivider(date)}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );

  // Main container style
  const containerStyle = {
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.chat || theme.palette.background.default,
  };

  // Message list style
  const listStyle = {
    flex: 1,
    overflow: 'auto',
    p: 0,
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.divider,
      borderRadius: '3px',
      '&:hover': {
        backgroundColor: theme.palette.text.disabled,
      },
    },
  };

  return (
    <Box sx={containerStyle} ref={containerRef}>
      {messages.length === 0 ? (
        <WelcomeMessage />
      ) : (
        <List sx={listStyle}>
          {messages.map((message, index) => (
            <React.Fragment key={message.id}>
              {/* Date divider */}
              {shouldShowDateDivider(index) && (
                <DateDivider date={message.timestamp} />
              )}
              
              {/* Message */}
              <ListItem sx={{ p: 0, display: 'block' }}>
                <ChatMessage 
                  message={message} 
                  showAvatar={shouldShowAvatar(index)}
                  onImageGenerated={onImageGenerated}
                />
              </ListItem>
            </React.Fragment>
          ))}
          
          {/* Element for auto scroll */}
          <div ref={messagesEndRef} />
        </List>
      )}
    </Box>
  );
};

export default MessageList;