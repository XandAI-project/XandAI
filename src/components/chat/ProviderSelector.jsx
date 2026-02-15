import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  Check as CheckIcon,
  SmartToy as OllamaIcon,
  Dns as ServerIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';
import { useDynamicLLM } from '../../application/hooks/useDynamicLLM';
import { useOllama } from '../../application/hooks/useOllama';

/**
 * Provider icons mapping
 */
const ProviderIcons = {
  ollama: OllamaIcon,
  vllm: ServerIcon,
  llamacpp: MemoryIcon,
};

/**
 * Provider selector component
 * @param {Object} props - Component properties
 * @param {Function} props.onOpenSettings - Callback to open settings
 * @param {string} props.currentProvider - Current provider type (ollama or dynamic_llm)
 * @param {Function} props.onProviderChange - Callback when provider changes
 * @returns {JSX.Element}
 */
const ProviderSelector = ({ onOpenSettings, currentProvider, onProviderChange }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const { config: dynamicLLMConfig } = useDynamicLLM();
  const { config: ollamaConfig } = useOllama();

  /**
   * Handle menu open
   */
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * Handle menu close
   */
  const handleClose = () => {
    setAnchorEl(null);
  };

  /**
   * Handle provider selection
   */
  const handleSelectProvider = (providerType, backend = null) => {
    handleClose();
    if (onProviderChange) {
      onProviderChange(providerType, backend);
    }
  };

  /**
   * Handle open settings
   */
  const handleOpenSettings = () => {
    handleClose();
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  /**
   * Get current provider display info
   */
  const getCurrentProviderInfo = () => {
    if (currentProvider === 'ollama') {
      const modelName = ollamaConfig?.selectedModel || 'No Model';
      return {
        label: 'Ollama',
        sublabel: modelName,
        icon: OllamaIcon,
        color: 'primary',
      };
    } else if (currentProvider === 'dynamic_llm') {
      const backend = dynamicLLMConfig?.provider || 'vllm';
      const backendLabels = {
        vllm: 'vLLM',
        llamacpp: 'LlamaCPP',
      };
      
      return {
        label: backendLabels[backend] || 'Dynamic LLM',
        sublabel: dynamicLLMConfig?.model ? 
          (dynamicLLMConfig.model.split('/').pop() || 'No Model') : 
          'No Model',
        icon: ProviderIcons[backend] || ServerIcon,
        color: 'secondary',
      };
    }

    return {
      label: 'Select Provider',
      sublabel: '',
      icon: ServerIcon,
      color: 'default',
    };
  };

  const providerInfo = getCurrentProviderInfo();
  const IconComponent = providerInfo.icon;

  return (
    <Box>
      <Tooltip title="Select AI Provider">
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          endIcon={<ArrowDownIcon />}
          startIcon={<IconComponent />}
          sx={{
            minWidth: 180,
            justifyContent: 'space-between',
            textTransform: 'none',
            borderColor: theme.palette.divider,
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <Box sx={{ textAlign: 'left', overflow: 'hidden' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {providerInfo.label}
            </Typography>
            {providerInfo.sublabel && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  lineHeight: 1,
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {providerInfo.sublabel}
              </Typography>
            )}
          </Box>
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="overline" color="text.secondary">
            AI Provider
          </Typography>
        </Box>
        <Divider />

        {/* Ollama */}
        <MenuItem
          onClick={() => handleSelectProvider('ollama')}
          selected={currentProvider === 'ollama'}
        >
          <ListItemIcon>
            <OllamaIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Ollama"
            secondary="Local models via Ollama API"
          />
          {currentProvider === 'ollama' && (
            <CheckIcon fontSize="small" color="primary" />
          )}
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ px: 2, py: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Dynamic LLM Backends
          </Typography>
        </Box>

        {/* vLLM */}
        <MenuItem
          onClick={() => handleSelectProvider('dynamic_llm', 'vllm')}
          selected={currentProvider === 'dynamic_llm' && dynamicLLMConfig?.provider === 'vllm'}
        >
          <ListItemIcon>
            <ServerIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="vLLM"
            secondary="GPU-optimized inference"
          />
          {currentProvider === 'dynamic_llm' && dynamicLLMConfig?.provider === 'vllm' && (
            <CheckIcon fontSize="small" color="secondary" />
          )}
        </MenuItem>

        {/* LlamaCPP */}
        <MenuItem
          onClick={() => handleSelectProvider('dynamic_llm', 'llamacpp')}
          selected={currentProvider === 'dynamic_llm' && dynamicLLMConfig?.provider === 'llamacpp'}
        >
          <ListItemIcon>
            <MemoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="LlamaCPP"
            secondary="GGUF quantized models"
          />
          {currentProvider === 'dynamic_llm' && dynamicLLMConfig?.provider === 'llamacpp' && (
            <CheckIcon fontSize="small" color="secondary" />
          )}
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {/* Settings */}
        <MenuItem onClick={handleOpenSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Provider Settings" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ProviderSelector;
