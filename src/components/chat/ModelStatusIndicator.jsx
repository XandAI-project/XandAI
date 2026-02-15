import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle as LoadedIcon,
  Error as NotLoadedIcon,
  HourglassEmpty as LoadingIcon,
} from '@mui/icons-material';
import { useDynamicLLM } from '../../application/hooks/useDynamicLLM';

const DONT_SHOW_AGAIN_KEY = 'dynamic-llm-dont-show-loading-warning';

/**
 * Model status indicator component
 * Shows whether the selected model is loaded in Dynamic LLM API
 * @param {Object} props - Component properties
 * @param {string} props.modelPath - Current model path
 * @param {boolean} props.enabled - Whether to show indicator
 * @returns {JSX.Element}
 */
const ModelStatusIndicator = ({ modelPath, enabled = true }) => {
  const { loadedModels, fetchLoadedModels, isLoading } = useDynamicLLM();
  const [isLoaded, setIsLoaded] = useState(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Check if model is loaded
  useEffect(() => {
    if (!enabled || !modelPath) {
      setIsLoaded(null);
      return;
    }

    const checkModelStatus = async () => {
      try {
        await fetchLoadedModels();
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking model status:', error);
        setIsLoaded(null);
      }
    };

    checkModelStatus();
    
    // Poll every 10 seconds
    const interval = setInterval(checkModelStatus, 10000);
    return () => clearInterval(interval);
  }, [modelPath, enabled, fetchLoadedModels]);

  // Update loaded status based on loaded models
  useEffect(() => {
    if (!hasChecked || !modelPath) {
      setIsLoaded(null);
      return;
    }

    const modelIsLoaded = loadedModels.some(m => m.model === modelPath);
    setIsLoaded(modelIsLoaded);

    // Show warning dialog if model is not loaded and user hasn't dismissed it
    if (!modelIsLoaded && hasChecked) {
      const dontShow = localStorage.getItem(DONT_SHOW_AGAIN_KEY) === 'true';
      if (!dontShow) {
        // Small delay to avoid showing on initial load
        setTimeout(() => {
          setShowWarningDialog(true);
        }, 500);
      }
    }
  }, [loadedModels, modelPath, hasChecked]);

  /**
   * Handle dialog close
   */
  const handleCloseDialog = () => {
    if (dontShowAgain) {
      localStorage.setItem(DONT_SHOW_AGAIN_KEY, 'true');
    }
    setShowWarningDialog(false);
    setDontShowAgain(false);
  };

  if (!enabled || !modelPath) {
    return null;
  }

  /**
   * Get status display info
   */
  const getStatusInfo = () => {
    if (isLoading && isLoaded === null) {
      return {
        icon: <LoadingIcon fontSize="small" />,
        label: 'Checking...',
        color: 'default',
        tooltip: 'Checking model status...',
      };
    }

    if (isLoaded === true) {
      return {
        icon: <LoadedIcon fontSize="small" />,
        label: 'Loaded',
        color: 'success',
        tooltip: 'Model is currently loaded in memory',
      };
    }

    if (isLoaded === false) {
      return {
        icon: <NotLoadedIcon fontSize="small" />,
        label: 'Not Loaded',
        color: 'warning',
        tooltip: 'Model will be loaded on first use (may take longer)',
      };
    }

    return {
      icon: <CircularProgress size={14} />,
      label: 'Unknown',
      color: 'default',
      tooltip: 'Model status unknown',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <Tooltip title={statusInfo.tooltip}>
        <Chip
          icon={statusInfo.icon}
          label={statusInfo.label}
          size="small"
          color={statusInfo.color}
          variant="outlined"
          sx={{ ml: 1 }}
        />
      </Tooltip>

      {/* Warning Dialog */}
      <Dialog
        open={showWarningDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Model Not Currently Loaded
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1">
              The selected model is not currently loaded in memory. 
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your first message will take longer than usual while the model loads. 
              Subsequent messages will be faster once the model is in memory.
            </Typography>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 1, 
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Model Details
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {modelPath}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  Don't show this warning again
                </Typography>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ModelStatusIndicator;
