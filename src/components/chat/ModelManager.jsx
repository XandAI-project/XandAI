import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandIcon,
  CheckCircle as LoadedIcon,
  Cancel as CancelIcon,
  Memory as MemoryIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useDynamicLLM } from '../../application/hooks/useDynamicLLM';

/**
 * Model Manager Component
 * Comprehensive interface for managing models: loaded models, inventory, downloads
 */
const ModelManager = ({ open, onClose }) => {
  const {
    loadedModels,
    availableModels,
    downloads,
    fetchLoadedModels,
    fetchAvailableModels,
    downloadModel,
    unloadModel,
    unloadAllModels,
    getDownloadStatus,
    cancelDownload,
    getCacheStats,
  } = useDynamicLLM();

  const [tabValue, setTabValue] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  
  // Download form state
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadDest, setDownloadDest] = useState('');
  const [downloadQuantization, setDownloadQuantization] = useState('');

  // Refresh data when dialog opens
  useEffect(() => {
    if (open) {
      handleRefresh();
    }
  }, [open]);

  // Auto-refresh downloads every 2 seconds if there are active downloads
  useEffect(() => {
    if (!open) return;

    const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'pending');
    if (activeDownloads.length === 0) return;

    const interval = setInterval(async () => {
      for (const download of activeDownloads) {
        await getDownloadStatus(download.job_id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [open, downloads]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchLoadedModels(),
        fetchAvailableModels(),
        getCacheStats().then(stats => setCacheStats(stats)),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!downloadUrl || !downloadDest) {
      alert('Please provide both URL and destination');
      return;
    }

    try {
      const options = {
        destination: downloadDest,
      };

      if (downloadQuantization) {
        options.quantization = downloadQuantization;
      }

      await downloadModel(downloadUrl, options);
      
      // Clear form
      setDownloadUrl('');
      setDownloadDest('');
      setDownloadQuantization('');
      
      // Switch to downloads tab
      setTabValue(2);
    } catch (error) {
      console.error('Error downloading model:', error);
      alert(`Download failed: ${error.message}`);
    }
  };

  const handleUnloadModel = async (modelPath, backend) => {
    if (!confirm(`Unload model ${modelPath}?`)) return;
    
    try {
      await unloadModel(modelPath, backend);
      await fetchLoadedModels();
    } catch (error) {
      console.error('Error unloading model:', error);
      alert(`Failed to unload: ${error.message}`);
    }
  };

  const handleUnloadAll = async () => {
    if (!confirm('Unload all models? This will free up GPU memory.')) return;
    
    try {
      await unloadAllModels();
      await fetchLoadedModels();
    } catch (error) {
      console.error('Error unloading all models:', error);
      alert(`Failed to unload all: ${error.message}`);
    }
  };

  const handleCancelDownload = async (jobId) => {
    try {
      await cancelDownload(jobId);
    } catch (error) {
      console.error('Error canceling download:', error);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon />
          Model Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="small" disabled={isRefreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {isRefreshing && <LinearProgress />}

      <Divider />

      {/* Cache Stats Banner */}
      {cacheStats && (
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<MemoryIcon />} 
              label={`Loaded: ${cacheStats.loaded_count || 0}`} 
              color="primary" 
              size="small"
            />
            <Chip 
              icon={<StorageIcon />} 
              label={`Available: ${cacheStats.available_count || 0}`} 
              color="default" 
              size="small"
            />
            <Chip 
              icon={<TimerIcon />} 
              label={`Uptime: ${formatDuration(cacheStats.cache_uptime_seconds)}`} 
              color="default" 
              size="small"
            />
          </Box>
        </Box>
      )}

      <Tabs 
        value={tabValue} 
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab label={`Loaded Models (${loadedModels.length})`} />
        <Tab label={`Inventory (${availableModels.length})`} />
        <Tab label={`Downloads (${downloads.length})`} />
        <Tab label="Download New Model" />
      </Tabs>

      <DialogContent sx={{ pt: 2 }}>
        {/* Tab 0: Loaded Models */}
        {tabValue === 0 && (
          <Box>
            {loadedModels.length === 0 ? (
              <Alert severity="info">No models currently loaded</Alert>
            ) : (
              <>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Currently loaded models consuming GPU/CPU memory
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleUnloadAll}
                    color="warning"
                  >
                    Unload All
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Model Path</TableCell>
                        <TableCell>Backend</TableCell>
                        <TableCell>Device</TableCell>
                        <TableCell>Loaded At</TableCell>
                        <TableCell>Last Used</TableCell>
                        <TableCell>TTL</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadedModels.map((model, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {model.model_path || model.cache_key}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={model.backend} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={model.device} 
                              size="small" 
                              color={model.device === 'cuda' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{formatDate(model.loaded_at)}</TableCell>
                          <TableCell>{formatDate(model.last_used)}</TableCell>
                          <TableCell>
                            {model.ttl === 0 ? 'Never' : `${model.ttl}s`}
                            {model.ttl_remaining && ` (${model.ttl_remaining}s left)`}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Unload">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleUnloadModel(model.model_path, model.backend)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {/* Tab 1: Model Inventory */}
        {tabValue === 1 && (
          <Box>
            {availableModels.length === 0 ? (
              <Alert severity="info">No models found in inventory. Download models from HuggingFace.</Alert>
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Models available on disk
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Path</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {availableModels.map((model, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {model.path}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={model.type || 'Unknown'} 
                              size="small"
                              color={model.type === 'gguf' ? 'secondary' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>{formatBytes(model.size)}</TableCell>
                          <TableCell>
                            {model.is_loaded ? (
                              <Chip icon={<LoadedIcon />} label="Loaded" size="small" color="success" />
                            ) : (
                              <Chip label="Available" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {/* Tab 2: Downloads */}
        {tabValue === 2 && (
          <Box>
            {downloads.length === 0 ? (
              <Alert severity="info">No downloads</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {downloads.map((download) => (
                  <Paper key={download.job_id} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {download.url}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Destination: {download.destination}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip 
                          label={download.status} 
                          size="small"
                          color={
                            download.status === 'completed' ? 'success' :
                            download.status === 'downloading' ? 'primary' :
                            download.status === 'failed' ? 'error' : 'default'
                          }
                        />
                        {(download.status === 'downloading' || download.status === 'pending') && (
                          <Tooltip title="Cancel">
                            <IconButton size="small" onClick={() => handleCancelDownload(download.job_id)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>

                    {download.progress !== undefined && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">
                            {formatBytes(download.downloaded_bytes)} / {formatBytes(download.total_bytes)}
                          </Typography>
                          <Typography variant="caption">
                            {Math.round(download.progress * 100)}%
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={download.progress * 100} />
                      </Box>
                    )}

                    {download.message && (
                      <Alert severity={download.status === 'failed' ? 'error' : 'info'} sx={{ mt: 1 }}>
                        {download.message}
                      </Alert>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Tab 3: Download New Model */}
        {tabValue === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Download models from HuggingFace. Supports GGUF models for LlamaCPP and standard models for vLLM.
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="HuggingFace URL"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://huggingface.co/username/model-name"
                helperText="Full URL to HuggingFace model repository"
              />

              <TextField
                fullWidth
                label="Destination Folder"
                value={downloadDest}
                onChange={(e) => setDownloadDest(e.target.value)}
                placeholder="qwen3-coder-30b"
                helperText="Folder name to save model (created in /models/)"
              />

              <TextField
                fullWidth
                label="Quantization (Optional)"
                value={downloadQuantization}
                onChange={(e) => setDownloadQuantization(e.target.value)}
                placeholder="Q4_K_M"
                helperText="For GGUF models only: specify quantization level (e.g., Q4_K_M, Q5_K_S, IQ4_XS)"
              />

              <Accordion>
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Typography variant="subtitle2">Examples</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" fontWeight={600}>GGUF Model (LlamaCPP):</Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        URL: https://huggingface.co/bartowski/Qwen3-Coder-30B-A3B-Instruct-GGUF
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                        Destination: qwen3-iq4xs
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                        Quantization: IQ4_XS
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" fontWeight={600}>Standard Model (vLLM):</Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        URL: https://huggingface.co/Qwen/Qwen3-Coder-30B
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                        Destination: qwen3-coder-30b
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadModel}
                disabled={!downloadUrl || !downloadDest}
                fullWidth
              >
                Start Download
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelManager;
