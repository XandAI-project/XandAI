import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  MoreVert as MoreIcon,
  SmartToy as BotIcon,
  Circle as OnlineIcon,
  Refresh as RefreshIcon,
  ClearAll as ClearIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import ModelSelector from './ModelSelector';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Chat header component
 * @param {Object} props - Component properties
 * @param {Function} props.onMenuClick - Callback to open menu
 * @param {Function} props.onClearChat - Callback to clear chat (receives mode: 'messages' or 'conversation')
 * @param {Function} props.onRefresh - Callback to refresh
 * @param {Function} props.onSettings - Callback to open settings
 * @param {number} props.messageCount - Number of messages
 * @param {boolean} props.isTyping - Whether it's typing
 * @returns {JSX.Element}
 */
const ChatHeader = ({ 
  onMenuClick, 
  onClearChat, 
  onRefresh,
  onSettings,
  onWhatsApp,
  messageCount = 0,
  isTyping = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout, getFullName, getInitials } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [clearMenuAnchor, setClearMenuAnchor] = useState(null);

  // Bot status
  const botStatus = isTyping ? 'typing...' : 'online';
  const statusColor = isTyping ? 'warning' : 'success';

  /**
   * Opens the user menu
   */
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  /**
   * Closes the user menu
   */
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  /**
   * Handles user logout
   */
  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  /**
   * Handles profile opening
   */
  const handleProfile = () => {
    handleUserMenuClose();
    // TODO: Implement profile page
    console.log('Open profile');
  };

  /**
   * Opens the clear menu
   */
  const handleClearMenuOpen = (event) => {
    setClearMenuAnchor(event.currentTarget);
  };

  /**
   * Closes the clear menu
   */
  const handleClearMenuClose = () => {
    setClearMenuAnchor(null);
  };

  /**
   * Handles clearing messages only
   */
  const handleClearMessages = () => {
    handleClearMenuClose();
    onClearChat('messages');
  };

  /**
   * Handles deleting entire conversation
   */
  const handleDeleteConversation = () => {
    handleClearMenuClose();
    onClearChat('conversation');
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
        borderRadius: 0,
      }}
    >
      <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
        {/* Menu button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Avatar and bot information */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
          {/* XandAI Logo */}
          <Avatar
            sx={{
              backgroundColor: 'transparent',
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
            }}
            src="/logo.png"
            alt="XandAI"
          >
            <BotIcon />
          </Avatar>

          {/* Information */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="h6" 
              component="div"
              sx={{ 
                fontWeight: 600,
                fontSize: isMobile ? '1rem' : '1.25rem',
                lineHeight: 1.2
              }}
            >
              XandAI
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              {/* Online status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OnlineIcon 
                  sx={{ 
                    fontSize: 8, 
                    color: theme.palette[statusColor].main 
                  }} 
                />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {botStatus}
                </Typography>
              </Box>

              {/* Message counter (desktop only) */}
              {!isMobile && messageCount > 0 && (
                <Chip
                  label={`${messageCount} messages`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.secondary,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Model selector */}
        {!isMobile && (
          <Box sx={{ mr: 2 }}>
            <ModelSelector onOpenSettings={onSettings} />
          </Box>
        )}

        {/* Header actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* WhatsApp button */}
          {onWhatsApp && (
            <Tooltip title="WhatsApp Integration">
              <IconButton
                color="inherit"
                onClick={onWhatsApp}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  '&:hover': {
                    color: '#25D366', // WhatsApp green color
                  }
                }}
              >
                <WhatsAppIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Settings button */}
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              onClick={onSettings}
              size={isMobile ? 'small' : 'medium'}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* Refresh button */}
          <Tooltip title="Refresh chat">
            <IconButton
              color="inherit"
              onClick={onRefresh}
              size={isMobile ? 'small' : 'medium'}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {/* Clear chat button with menu */}
          {messageCount > 0 && (
            <Tooltip title="Clear options">
              <IconButton
                color="inherit"
                onClick={handleClearMenuOpen}
                size={isMobile ? 'small' : 'medium'}
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* User avatar */}
          <Tooltip title={`${getFullName()} - Click for options`}>
            <IconButton
              color="inherit"
              onClick={handleUserMenuOpen}
              size={isMobile ? 'small' : 'medium'}
              sx={{ ml: 1 }}
            >
              <Avatar
                sx={{
                  width: isMobile ? 28 : 32,
                  height: isMobile ? 28 : 32,
                  backgroundColor: theme.palette.secondary.main,
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                }}
                src={user?.avatar}
              >
                {getInitials()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Progress bar for typing */}
      {isTyping && (
        <Box
          sx={{
            height: 2,
            backgroundColor: theme.palette.warning.main,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Clear menu */}
      <Menu
        anchorEl={clearMenuAnchor}
        open={Boolean(clearMenuAnchor)}
        onClose={handleClearMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleClearMessages}>
          <ListItemIcon>
            <ClearIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText 
            primary="Clear Messages"
            secondary="Keep conversation"
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleDeleteConversation}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText 
            primary="Delete Conversation"
            secondary="Remove permanently"
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
      </Menu>

      {/* User menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User information */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {getFullName()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>

        <Divider />

        {/* Menu options */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            My Profile
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={onSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Settings
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Logout
          </ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default ChatHeader;