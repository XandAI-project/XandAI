import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlRadio,
  Radio,
  FormControlLabel,
  Slider,
  Typography,
  Box,
  Divider,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Refresh as ResetIcon,
} from '@mui/icons-material';
import { useDynamicLLM } from '../../application/hooks/useDynamicLLM';
import { validateModelPath, getModelPathPlaceholder, getModelPathExamples } from '../../utils/modelPathValidator';

/**
 * Provider Settings Dialog Component
 * Allows comprehensive configuration of Dynamic LLM backends (vLLM, LlamaCPP)
 */
const ProviderSettingsDialog = ({ open, onClose }) => {
  const { config, updateConfig, selectProvider, setModel, validateModelPath: validatePath } = useDynamicLLM();
  
  // Local state for form
  const [localConfig, setLocalConfig] = useState({ ...config });
  const [modelPathError, setModelPathError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local config when dialog opens
  useEffect(() => {
    if (open) {
      setLocalConfig({ ...config });
      setHasChanges(false);
      setModelPathError(null);
    }
  }, [open, config]);

  // Handle config changes
  const handleChange = (field, value) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // Validate model path on change
    if (field === 'model' || field === 'provider') {
      const provider = field === 'provider' ? value : localConfig.provider;
      const modelPath = field === 'model' ? value : localConfig.model;
      
      if (modelPath) {
        const validation = validateModelPath(modelPath, provider);
        setModelPathError(validation.valid ? null : validation.error);
      } else {
        setModelPathError(null);
      }
    }
  };

  // Handle save
  const handleSave = () => {
    // Final validation
    if (localConfig.model) {
      const validation = validateModelPath(localConfig.model, localConfig.provider);
      if (!validation.valid) {
        setModelPathError(validation.error);
        return;
      }
    }

    // Update config
    updateConfig(localConfig);
    onClose();
  };

  // Handle reset to defaults
  const handleReset = () => {
    const defaults = {
      provider: 'vllm',
      model: '',
      device: 'cuda',
      ttl: 600,
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.95,
      presence_penalty: 0,
      frequency_penalty: 0,
      stop: [],
      stream: true,
      gpu_memory_utilization: 0.9,
      n_gpu_layers: -1,
      n_ctx: 4096,
    };
    setLocalConfig(defaults);
    setHasChanges(true);
    setModelPathError(null);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '70vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" component="div">
          Dynamic LLM Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Provider Selection */}
          <Box>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                Backend Provider
              </FormLabel>
              <RadioGroup
                row
                value={localConfig.provider}
                onChange={(e) => handleChange('provider', e.target.value)}
              >
                <FormControlLabel 
                  value="vllm" 
                  control={<Radio />} 
                  label="vLLM (Fast inference)" 
                />
                <FormControlLabel 
                  value="llamacpp" 
                  control={<Radio />} 
                  label="LlamaCPP (GGUF models)" 
                />
              </RadioGroup>
            </FormControl>
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="caption">
                {localConfig.provider === 'vllm' 
                  ? 'vLLM: High-performance inference for HuggingFace models. Use folder paths.'
                  : 'LlamaCPP: Efficient inference for GGUF quantized models. Use .gguf file paths.'
                }
              </Typography>
            </Alert>
          </Box>

          {/* Model Path */}
          <Box>
            <TextField
              fullWidth
              label="Model Path"
              value={localConfig.model}
              onChange={(e) => handleChange('model', e.target.value)}
              placeholder={getModelPathPlaceholder(localConfig.provider)}
              error={Boolean(modelPathError)}
              helperText={modelPathError || getModelPathExamples(localConfig.provider)[0]}
              required
            />
          </Box>

          {/* Device Selection */}
          <Box>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                Compute Device
              </FormLabel>
              <RadioGroup
                row
                value={localConfig.device}
                onChange={(e) => handleChange('device', e.target.value)}
              >
                <FormControlLabel value="cuda" control={<Radio />} label="CUDA (GPU)" />
                <FormControlLabel value="cpu" control={<Radio />} label="CPU" />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* TTL */}
          <Box>
            <Typography variant="body2" gutterBottom fontWeight={600}>
              Model Cache TTL: {localConfig.ttl} seconds
              <Tooltip title="Time-to-live: how long to keep model loaded after last use">
                <InfoIcon sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'middle' }} />
              </Tooltip>
            </Typography>
            <Slider
              value={localConfig.ttl}
              onChange={(e, value) => handleChange('ttl', value)}
              min={0}
              max={3600}
              step={60}
              marks={[
                { value: 0, label: '0 (always)' },
                { value: 600, label: '10m' },
                { value: 1800, label: '30m' },
                { value: 3600, label: '1h' },
              ]}
            />
          </Box>

          {/* Completion Parameters */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="subtitle1" fontWeight={600}>
                Completion Parameters
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Temperature */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Temperature: {localConfig.temperature}
                  </Typography>
                  <Slider
                    value={localConfig.temperature}
                    onChange={(e, value) => handleChange('temperature', value)}
                    min={0.0}
                    max={2.0}
                    step={0.1}
                    marks={[
                      { value: 0.0, label: '0.0' },
                      { value: 1.0, label: '1.0' },
                      { value: 2.0, label: '2.0' },
                    ]}
                  />
                </Box>

                {/* Max Tokens */}
                <TextField
                  fullWidth
                  type="number"
                  label="Max Tokens"
                  value={localConfig.max_tokens}
                  onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 32000 }}
                />

                {/* Top P */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Top-P: {localConfig.top_p}
                  </Typography>
                  <Slider
                    value={localConfig.top_p}
                    onChange={(e, value) => handleChange('top_p', value)}
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    marks={[
                      { value: 0.0, label: '0.0' },
                      { value: 0.5, label: '0.5' },
                      { value: 1.0, label: '1.0' },
                    ]}
                  />
                </Box>

                {/* Presence Penalty */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Presence Penalty: {localConfig.presence_penalty}
                  </Typography>
                  <Slider
                    value={localConfig.presence_penalty}
                    onChange={(e, value) => handleChange('presence_penalty', value)}
                    min={-2.0}
                    max={2.0}
                    step={0.1}
                    marks={[
                      { value: -2.0, label: '-2.0' },
                      { value: 0.0, label: '0.0' },
                      { value: 2.0, label: '2.0' },
                    ]}
                  />
                </Box>

                {/* Frequency Penalty */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Frequency Penalty: {localConfig.frequency_penalty}
                  </Typography>
                  <Slider
                    value={localConfig.frequency_penalty}
                    onChange={(e, value) => handleChange('frequency_penalty', value)}
                    min={-2.0}
                    max={2.0}
                    step={0.1}
                    marks={[
                      { value: -2.0, label: '-2.0' },
                      { value: 0.0, label: '0.0' },
                      { value: 2.0, label: '2.0' },
                    ]}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Backend-Specific Parameters */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="subtitle1" fontWeight={600}>
                {localConfig.provider === 'vllm' ? 'vLLM' : 'LlamaCPP'} Configuration
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {localConfig.provider === 'vllm' ? (
                  <>
                    {/* GPU Memory Utilization */}
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        GPU Memory Utilization: {localConfig.gpu_memory_utilization}
                        <Tooltip title="Fraction of GPU memory to use for model">
                          <InfoIcon sx={{ fontSize: 16, ml: 0.5, verticalAlign: 'middle' }} />
                        </Tooltip>
                      </Typography>
                      <Slider
                        value={localConfig.gpu_memory_utilization}
                        onChange={(e, value) => handleChange('gpu_memory_utilization', value)}
                        min={0.1}
                        max={0.95}
                        step={0.05}
                        marks={[
                          { value: 0.1, label: '0.1' },
                          { value: 0.5, label: '0.5' },
                          { value: 0.9, label: '0.9' },
                        ]}
                      />
                    </Box>
                  </>
                ) : (
                  <>
                    {/* N GPU Layers */}
                    <TextField
                      fullWidth
                      type="number"
                      label="GPU Layers (-1 = all)"
                      value={localConfig.n_gpu_layers}
                      onChange={(e) => handleChange('n_gpu_layers', parseInt(e.target.value))}
                      helperText="Number of layers to offload to GPU. -1 = all layers"
                      inputProps={{ min: -1, max: 100 }}
                    />

                    {/* Context Window */}
                    <TextField
                      fullWidth
                      type="number"
                      label="Context Window Size"
                      value={localConfig.n_ctx}
                      onChange={(e) => handleChange('n_ctx', parseInt(e.target.value))}
                      helperText="Maximum context size in tokens"
                      inputProps={{ min: 512, max: 32768, step: 512 }}
                    />
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          startIcon={<ResetIcon />}
          onClick={handleReset}
          color="secondary"
        >
          Reset to Defaults
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={!hasChanges || Boolean(modelPathError) || !localConfig.model}
          >
            Save Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ProviderSettingsDialog;
