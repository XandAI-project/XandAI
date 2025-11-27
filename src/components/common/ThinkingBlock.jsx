import React, { useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Typography,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  Psychology as ThinkingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as SparkleIcon
} from '@mui/icons-material';

/**
 * Component to display AI thinking process in a collapsible block
 * @param {Object} props - Component properties
 * @param {string} props.content - The thinking content to display
 * @param {boolean} props.defaultExpanded - Whether to show expanded by default
 * @returns {JSX.Element}
 */
const ThinkingBlock = ({ content, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();
  
  const isDarkMode = theme.palette.mode === 'dark' || 
                     theme.palette.background.default === '#121212';

  // Thinking block colors - subtle purple/violet tones
  const colors = {
    background: isDarkMode 
      ? alpha(theme.palette.info.dark, 0.08)
      : alpha(theme.palette.info.light, 0.12),
    border: isDarkMode 
      ? alpha(theme.palette.info.main, 0.3)
      : alpha(theme.palette.info.main, 0.25),
    headerBg: isDarkMode 
      ? alpha(theme.palette.info.dark, 0.15)
      : alpha(theme.palette.info.light, 0.2),
    text: isDarkMode 
      ? theme.palette.grey[300]
      : theme.palette.grey[700],
    icon: isDarkMode 
      ? theme.palette.info.light
      : theme.palette.info.main,
    accent: theme.palette.info.main
  };

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  // Clean up the thinking content (remove extra whitespace)
  const cleanContent = content?.trim() || '';

  if (!cleanContent) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        overflow: 'hidden',
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: colors.accent,
          boxShadow: `0 0 0 1px ${alpha(colors.accent, 0.1)}`
        }
      }}
    >
      {/* Header - Always visible */}
      <Box
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          backgroundColor: colors.headerBg,
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(colors.headerBg, 1.5)
          }
        }}
      >
        {/* Animated thinking icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: alpha(colors.icon, 0.15),
            animation: expanded ? 'none' : 'pulse 2s ease-in-out infinite'
          }}
        >
          <ThinkingIcon 
            sx={{ 
              fontSize: 18, 
              color: colors.icon,
            }} 
          />
        </Box>

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600, 
              color: colors.icon,
              letterSpacing: '0.02em'
            }}
          >
            Reasoning Process
          </Typography>
          
          {!expanded && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: colors.text,
                opacity: 0.7,
                fontStyle: 'italic'
              }}
            >
              Click to expand
            </Typography>
          )}
        </Box>

        <IconButton 
          size="small" 
          sx={{ 
            color: colors.icon,
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={expanded} timeout={300}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: `1px dashed ${colors.border}`,
            maxHeight: '400px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '6px'
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent'
            },
            '&::-webkit-scrollbar-thumb': {
              background: colors.border,
              borderRadius: '3px'
            }
          }}
        >
          <Typography
            component="div"
            variant="body2"
            sx={{
              color: colors.text,
              lineHeight: 1.7,
              fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              '& p': {
                mb: 1,
                '&:last-child': { mb: 0 }
              }
            }}
          >
            {cleanContent}
          </Typography>
        </Box>

        {/* Footer hint */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            px: 2,
            py: 0.75,
            backgroundColor: alpha(colors.headerBg, 0.5),
            borderTop: `1px dashed ${colors.border}`
          }}
        >
          <SparkleIcon sx={{ fontSize: 12, color: colors.icon, opacity: 0.7 }} />
          <Typography 
            variant="caption" 
            sx={{ 
              color: colors.text, 
              opacity: 0.6,
              fontSize: '0.7rem'
            }}
          >
            AI's internal reasoning - not part of the final response
          </Typography>
        </Box>
      </Collapse>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}
      </style>
    </Paper>
  );
};

export default ThinkingBlock;

