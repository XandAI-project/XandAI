import React, { useState, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Mic as MicIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon
} from '@mui/icons-material';

/**
 * Message input component
 * @param {Object} props - Component properties
 * @param {Function} props.onSendMessage - Callback to send message
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.isLoading - Whether it's loading
 * @param {string} props.placeholder - Input placeholder
 * @returns {JSX.Element}
 */
const MessageInput = ({ 
  onSendMessage, 
  disabled = false, 
  isLoading = false,
  placeholder = "Type your message..."
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = useRef(null);

  /**
   * Handles message sending
   */
  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !isLoading) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Focus on input after sending
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  /**
   * Handles Enter key
   * @param {KeyboardEvent} event - Keyboard event
   */
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handles input changes
   * @param {Event} event - Change event
   */
  const handleInputChange = (event) => {
    setMessage(event.target.value);
  };

  /**
   * Checks if message can be sent
   */
  const canSend = message.trim().length > 0 && !disabled && !isLoading;

  // Main container style
  const containerStyle = {
    p: isMobile ? 1 : 2,
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
  };

  // Paper style that contains the input
  const inputPaperStyle = {
    display: 'flex',
    alignItems: 'flex-end',
    p: 1,
    borderRadius: 3,
    border: `2px solid ${isFocused ? theme.palette.primary.main : theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    transition: 'border-color 0.2s ease-in-out',
    gap: 1,
  };

  return (
    <Box sx={containerStyle}>
      <Paper sx={inputPaperStyle} elevation={0}>
        {/* Left action buttons (desktop only) */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Attach file">
              <IconButton 
                size="small" 
                disabled={disabled}
                sx={{ color: theme.palette.text.secondary }}
              >
                <AttachIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Add emoji">
              <IconButton 
                size="small" 
                disabled={disabled}
                sx={{ color: theme.palette.text.secondary }}
              >
                <EmojiIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Text input field */}
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          variant="standard"
          placeholder={placeholder}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          InputProps={{
            disableUnderline: true,
            sx: {
              fontSize: '1rem',
              lineHeight: 1.5,
              color: theme.palette.text.primary,
              '&::placeholder': {
                color: theme.palette.text.secondary,
                opacity: 0.7,
              },
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              padding: 0,
            },
            '& .MuiInputBase-input': {
              padding: '8px 0',
            },
          }}
        />

        {/* Right action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Microphone button */}
          <Tooltip title="Voice message">
            <IconButton 
              size="small" 
              disabled={disabled}
              sx={{ color: theme.palette.text.secondary }}
            >
              <MicIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Send button */}
          <Tooltip title={canSend ? "Send message" : "Type a message"}>
            <span>
              <IconButton
                onClick={handleSendMessage}
                disabled={!canSend}
                sx={{
                  backgroundColor: canSend ? theme.palette.primary.main : 'transparent',
                  color: canSend ? theme.palette.primary.contrastText : theme.palette.text.disabled,
                  '&:hover': {
                    backgroundColor: canSend ? theme.palette.primary.dark : 'transparent',
                  },
                  '&:disabled': {
                    backgroundColor: 'transparent',
                  },
                  transition: 'all 0.2s ease-in-out',
                  minWidth: 40,
                  minHeight: 40,
                }}
              >
                {isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {/* Mobile usage tip */}
      {isMobile && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 1 
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.75rem' }}
          >
            Press Enter to send
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MessageInput;