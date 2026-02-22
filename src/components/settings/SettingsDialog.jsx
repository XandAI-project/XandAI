import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Grid,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  Image as ImageIcon,
  SmartToy as SmartToyIcon,
  Psychology as PsychologyIcon,
  Tune as TuneIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { useOllama } from '../../application/hooks/useOllama';
import { useDynamicLLM } from '../../application/hooks/useDynamicLLM';
import { useStableDiffusion } from '../../application/hooks/useStableDiffusion';
import { StableDiffusionConfig } from '../../domain/entities/StableDiffusionConfig';
import authService from '../../services/AuthService';
import ProviderSettingsDialog from '../chat/ProviderSettingsDialog';
import ModelManager from '../chat/ModelManager';

/**
 * OLLAMA and Stable Diffusion settings dialog
 * @param {Object} props - Component properties
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback to close
 * @returns {JSX.Element}
 */
const SettingsDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const {
    config,
    models,
    serviceStatus,
    isLoading,
    error,
    updateConfig,
    testConnection,
    refreshModels,
    selectModel,
    toggleIntegration
  } = useOllama();

  const {
    config: dynamicLLMConfig,
    loadedModels,
    availableModels,
    fetchLoadedModels,
    fetchAvailableModels,
  } = useDynamicLLM();

  const {
    config: sdConfig,
    models: sdModels,
    serviceStatus: sdServiceStatus,
    isLoading: sdIsLoading,
    error: sdError,
    updateConfig: updateSdConfig,
    testConnection: testSdConnection,
    refreshModels: refreshSdModels,
    selectModel: selectSdModel,
    toggleIntegration: toggleSdIntegration
  } = useStableDiffusion();

  // States for tab control
  const [currentTab, setCurrentTab] = useState(0);
  
  // Dynamic LLM dialog states
  const [providerSettingsOpen, setProviderSettingsOpen] = useState(false);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);

  // Ollama states
  const [localConfig, setLocalConfig] = useState({
    baseUrl: 'http://localhost:11434',
    timeout: 30000,
    enabled: false,
    selectedModel: ''
  });

  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estados do Stable Diffusion
  const [localSdConfig, setLocalSdConfig] = useState({
    baseUrl: 'http://192.168.3.70:7861',
    model: 'v1-5-pruned-emaonly.safetensors',
    steps: 20,
    width: 512,
    height: 512,
    cfgScale: 7,
    sampler: 'Euler a',
    enabled: false,
    token: ''
  });

  const [sdTestResult, setSdTestResult] = useState(null);
  const [isSdTesting, setIsSdTesting] = useState(false);
  const [hasSdUnsavedChanges, setHasSdUnsavedChanges] = useState(false);

  // System Prompt states
  const [systemPrompt, setSystemPrompt] = useState('');
  const [originalSystemPrompt, setOriginalSystemPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveSuccess, setPromptSaveSuccess] = useState(false);

  // LLM Config states
  const [llmConfig, setLlmConfig] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    topK: 40,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    repeatPenalty: 1.1,
    seed: undefined
  });
  const [originalLlmConfig, setOriginalLlmConfig] = useState({});
  const [isSavingLlmConfig, setIsSavingLlmConfig] = useState(false);
  const [llmConfigSaveSuccess, setLlmConfigSaveSuccess] = useState(false);

  // Sincroniza configuração local com a global - Ollama
  useEffect(() => {
    if (config) {
      setLocalConfig({
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        enabled: config.enabled,
        selectedModel: config.selectedModel
      });
      setHasUnsavedChanges(false);
    }
  }, [config]);

  // Sincroniza configuração local com a global - Stable Diffusion
  useEffect(() => {
    if (sdConfig) {
      setLocalSdConfig({
        baseUrl: sdConfig.baseUrl,
        model: sdConfig.model,
        steps: sdConfig.steps,
        width: sdConfig.width,
        height: sdConfig.height,
        cfgScale: sdConfig.cfgScale,
        sampler: sdConfig.sampler,
        enabled: sdConfig.enabled,
        token: sdConfig.token || ''
      });
      setHasSdUnsavedChanges(false);
    }
  }, [sdConfig]);

  // Load user system prompt and LLM config
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const profile = await authService.getProfile();
        const prompt = profile.systemPrompt || '';
        setSystemPrompt(prompt);
        setOriginalSystemPrompt(prompt);

        const userLlmConfig = profile.llmConfig || {};
        const loadedConfig = {
          temperature: userLlmConfig.temperature ?? 0.7,
          maxTokens: userLlmConfig.maxTokens ?? 2048,
          topK: userLlmConfig.topK ?? 40,
          topP: userLlmConfig.topP ?? 0.9,
          frequencyPenalty: userLlmConfig.frequencyPenalty ?? 0,
          presencePenalty: userLlmConfig.presencePenalty ?? 0,
          repeatPenalty: userLlmConfig.repeatPenalty ?? 1.1,
          seed: userLlmConfig.seed
        };
        setLlmConfig(loadedConfig);
        setOriginalLlmConfig(loadedConfig);
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };

    if (open) {
      loadUserSettings();
    }
  }, [open]);

  /**
   * Manipula mudanças nos campos de configuração
   * @param {string} field - Campo alterado
   * @param {any} value - Novo valor
   */
  const handleConfigChange = (field, value) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setTestResult(null);
  };

  /**
   * Testa a conexão com o OLLAMA
   */
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(localConfig.baseUrl);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message,
        testedUrl: localConfig.baseUrl
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Salva as configurações
   */
  const handleSaveConfig = async () => {
    try {
      await updateConfig(localConfig);
      setHasUnsavedChanges(false);
      setTestResult(null);
      // Notifica que as configurações foram salvas
      console.log('Configurações salvas. Chat será atualizado na próxima mensagem.');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }
  };

  /**
   * Seleciona um modelo
   * @param {string} modelName - Nome do modelo
   */
  const handleSelectModel = async (modelName) => {
    try {
      console.log('Selecionando modelo:', modelName);
      await selectModel(modelName);
      setLocalConfig(prev => ({ ...prev, selectedModel: modelName }));
      setHasUnsavedChanges(false); // Marca como salvo pois selectModel já salva
      console.log('Modelo selecionado com sucesso:', modelName);
    } catch (error) {
      console.error('Erro ao selecionar modelo:', error);
    }
  };

  // FUNÇÕES PARA STABLE DIFFUSION

  /**
   * Manipula mudanças nos campos de configuração do SD
   * @param {string} field - Campo alterado
   * @param {any} value - Novo valor
   */
  const handleSdConfigChange = (field, value) => {
    setLocalSdConfig(prev => ({ ...prev, [field]: value }));
    setHasSdUnsavedChanges(true);
    setSdTestResult(null);
  };

  /**
   * Testa a conexão com o Stable Diffusion
   */
  const handleSdTestConnection = async () => {
    setIsSdTesting(true);
    setSdTestResult(null);
    
    try {
      // Atualiza temporariamente a config para teste
      await updateSdConfig(localSdConfig);
      const result = await testSdConnection();
      setSdTestResult(result);
    } catch (error) {
      setSdTestResult({
        success: false,
        message: error.message,
        testedUrl: localSdConfig.baseUrl
      });
    } finally {
      setIsSdTesting(false);
    }
  };

  /**
   * Salva as configurações do SD
   */
  const handleSaveSdConfig = async () => {
    try {
      await updateSdConfig(localSdConfig);
      setHasSdUnsavedChanges(false);
      setSdTestResult(null);
      console.log('Configurações do Stable Diffusion salvas.');
    } catch (error) {
      console.error('Erro ao salvar configuração SD:', error);
    }
  };

  /**
   * Seleciona um modelo SD
   * @param {string} modelName - Nome do modelo
   */
  const handleSelectSdModel = async (modelName) => {
    try {
      await selectSdModel(modelName);
      setLocalSdConfig(prev => ({ ...prev, model: modelName }));
    } catch (error) {
      console.error('Erro ao selecionar modelo SD:', error);
    }
  };

  /**
   * Manipula mudança de resolução
   * @param {Object} resolution - Objeto com width e height
   */
  const handleResolutionChange = (resolution) => {
    setLocalSdConfig(prev => ({ 
      ...prev, 
      width: resolution.width, 
      height: resolution.height 
    }));
    setHasSdUnsavedChanges(true);
  };

  /**
   * Atualiza lista de modelos
   */
  const handleRefreshModels = async () => {
    try {
      await refreshModels();
    } catch (error) {
      console.error('Erro ao atualizar modelos:', error);
    }
  };

  /**
   * Salva o system prompt
   */
  const handleSaveSystemPrompt = async () => {
    setIsSavingPrompt(true);
    setPromptSaveSuccess(false);
    
    try {
      await authService.updateProfile({ systemPrompt });
      setOriginalSystemPrompt(systemPrompt);
      setPromptSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setPromptSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving system prompt:', error);
      alert('Erro ao salvar system prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  /**
   * Reseta o system prompt para o padrão
   */
  const handleResetSystemPrompt = () => {
    setSystemPrompt('');
  };

  /**
   * Verifica se há mudanças não salvas no system prompt
   */
  const hasPromptUnsavedChanges = systemPrompt !== originalSystemPrompt;

  /**
   * Salva a configuração LLM
   */
  const handleSaveLlmConfig = async () => {
    setIsSavingLlmConfig(true);
    setLlmConfigSaveSuccess(false);
    
    try {
      await authService.updateProfile({ llmConfig });
      setOriginalLlmConfig(llmConfig);
      setLlmConfigSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setLlmConfigSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving LLM config:', error);
      alert('Erro ao salvar configuração LLM');
    } finally {
      setIsSavingLlmConfig(false);
    }
  };

  /**
   * Reseta a configuração LLM para os padrões
   */
  const handleResetLlmConfig = () => {
    setLlmConfig({
      temperature: 0.7,
      maxTokens: 2048,
      topK: 40,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0,
      repeatPenalty: 1.1,
      seed: undefined
    });
  };

  /**
   * Atualiza um campo da configuração LLM
   */
  const handleLlmConfigChange = (field, value) => {
    setLlmConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Verifica se há mudanças não salvas na config LLM
   */
  const hasLlmConfigUnsavedChanges = JSON.stringify(llmConfig) !== JSON.stringify(originalLlmConfig);

  /**
   * Renderiza o status da conexão
   */
  const renderConnectionStatus = () => {
    if (!serviceStatus) return null;

    const { isConnected, isConfigured, selectedModel, modelStatus } = serviceStatus;

    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Status da Conexão
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={1}>
              {isConnected ? (
                <CheckIcon color="success" fontSize="small" />
              ) : (
                <ErrorIcon color="error" fontSize="small" />
              )}
              <Typography variant="body2">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6}>
            <Box display="flex" alignItems="center" gap={1}>
              {isConfigured ? (
                <CheckIcon color="success" fontSize="small" />
              ) : (
                <ErrorIcon color="warning" fontSize="small" />
              )}
              <Typography variant="body2">
                {isConfigured ? 'Configured' : 'Not configured'}
              </Typography>
            </Box>
          </Grid>
          
          {selectedModel && (
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <MemoryIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  Model: {selectedModel}
                </Typography>
                <Chip 
                  size="small" 
                  label={modelStatus}
                  color={modelStatus === 'available' ? 'success' : 'warning'}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  /**
   * Renderiza o resultado do teste de conexão
   */
  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <Alert 
        severity={testResult.success ? 'success' : 'error'} 
        sx={{ mt: 2 }}
        action={
          testResult.success && (
            <Typography variant="body2" color="text.secondary">
              {testResult.modelsCount} modelos encontrados
            </Typography>
          )
        }
      >
        {testResult.success ? (
          <>
            Conexão estabelecida com sucesso!
            {testResult.models && testResult.models.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  Modelos disponíveis: {testResult.models.map(m => m.name).join(', ')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          `Falha na conexão: ${testResult.error}`
        )}
      </Alert>
    );
  };

  /**
   * Renderiza a lista de modelos
   */
  const renderModelsList = () => {
    if (!models || models.length === 0) {
      return (
        <Box textAlign="center" py={3}>
          <Typography variant="body2" color="text.secondary">
            {serviceStatus?.isConnected 
              ? 'Nenhum modelo encontrado' 
              : 'Conecte ao OLLAMA para ver os modelos'
            }
          </Typography>
        </Box>
      );
    }

    return (
      <List dense>
        {models.map((model) => (
          <ListItem key={model.name} disablePadding>
            <ListItemButton
              selected={model.name === localConfig.selectedModel}
              onClick={() => handleSelectModel(model.name)}
            >
              <ListItemIcon>
                <MemoryIcon 
                  color={model.name === localConfig.selectedModel ? 'primary' : 'inherit'} 
                />
              </ListItemIcon>
              <ListItemText
                primary={model.name}
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      {model.getFormattedSize()} • {model.getFamily()}
                    </Typography>
                    {model.name === localConfig.selectedModel && (
                      <Chip size="small" label="Selecionado" color="primary" sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                }
              />
              {model.name === localConfig.selectedModel && (
                <CheckIcon color="primary" />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  /**
   * Renderiza o status da conexão SD
   */
  const renderSdConnectionStatus = () => {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Status da Conexão
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Box display="flex" alignItems="center" gap={2}>
              {sdServiceStatus?.success ? (
                <Chip
                  icon={<CheckIcon />}
                  label="Connected"
                  color="success"
                  variant="outlined"
                />
              ) : sdServiceStatus?.requiresAuth || sdServiceStatus?.error === 'AUTHENTICATION_REQUIRED' || sdServiceStatus?.error === 'TOKEN_EXPIRED' ? (
                <Chip
                  icon={<WarningIcon />}
                  label="Login Required"
                  color="warning"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<ErrorIcon />}
                  label="Disconnected"
                  color="error"
                  variant="outlined"
                />
              )}
              
              <Typography variant="body2" color="text.secondary">
                {localSdConfig.baseUrl || 'URL não configurada'}
              </Typography>
            </Box>
            
            {sdServiceStatus?.message && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {sdServiceStatus.message}
              </Typography>
            )}

            {(sdServiceStatus?.requiresAuth || sdServiceStatus?.error === 'AUTHENTICATION_REQUIRED' || sdServiceStatus?.error === 'TOKEN_EXPIRED') && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 Faça login para usar todas as funcionalidades do Stable Diffusion
                </Typography>
              </Alert>
            )}
          </Grid>
          
          {sdServiceStatus?.success && (
            <Grid item xs={12} md={4}>
              <Box display="flex" flexDirection="column" alignItems="end">
                <Typography variant="body2" color="text.secondary">
                  Modelos: {sdModels.length}
                </Typography>
                {sdServiceStatus.version && (
                  <Typography variant="body2" color="text.secondary">
                    Versão: {sdServiceStatus.version}
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  /**
   * Renderiza o resultado do teste de conexão SD
   */
  const renderSdTestResult = () => {
    if (!sdTestResult) return null;

    return (
      <Alert 
        severity={sdTestResult.success ? 'success' : 'error'} 
        sx={{ mt: 2 }}
      >
        {sdTestResult.success ? (
          <>
            Conexão estabelecida com sucesso!
            {sdTestResult.models && sdTestResult.models.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {sdTestResult.models.length} modelos encontrados
                </Typography>
              </Box>
            )}
          </>
        ) : (
          `Falha na conexão: ${sdTestResult.message}`
        )}
      </Alert>
    );
  };

  /**
   * Renderiza a lista de modelos SD
   */
  const renderSdModelsList = () => {
    if (!sdModels || sdModels.length === 0) {
      return (
        <Box textAlign="center" py={3}>
          <Typography variant="body2" color="text.secondary">
            {sdServiceStatus?.success 
              ? 'Nenhum modelo encontrado' 
              : 'Conecte ao Stable Diffusion para ver os modelos'
            }
          </Typography>
        </Box>
      );
    }

    return (
      <List dense>
        {sdModels.map((model) => (
          <ListItem key={model.model_name} disablePadding>
            <ListItemButton
              selected={model.model_name === localSdConfig.model}
              onClick={() => handleSelectSdModel(model.model_name)}
            >
              <ListItemIcon>
                <ImageIcon 
                  color={model.model_name === localSdConfig.model ? 'primary' : 'inherit'} 
                />
              </ListItemIcon>
              <ListItemText
                primary={model.title}
                secondary={
                  <Box>
                    <Typography variant="caption" display="block">
                      {model.model_name}
                    </Typography>
                    {model.model_name === localSdConfig.model && (
                      <Chip size="small" label="Selecionado" color="primary" sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                }
              />
              {model.model_name === localSdConfig.model && (
                <CheckIcon color="primary" />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { 
          minHeight: isMobile ? '100vh' : '70vh',
          maxHeight: isMobile ? '100vh' : '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <SettingsIcon />
            <Typography variant="h6">
              AI Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Tabs for different settings */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minWidth: isMobile ? 60 : 120,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                padding: isMobile ? '8px 12px' : '12px 16px'
              }
            }}
          >
            <Tab 
              icon={<PsychologyIcon fontSize={isMobile ? "small" : "medium"} />} 
              label={isMobile ? "" : "System Prompt"}
              iconPosition="start"
            />
            <Tab 
              icon={<TuneIcon fontSize={isMobile ? "small" : "medium"} />} 
              label={isMobile ? "" : "LLM Parameters"}
              iconPosition="start"
            />
            <Tab 
              icon={<SmartToyIcon fontSize={isMobile ? "small" : "medium"} />} 
              label={isMobile ? "" : "Ollama"}
              iconPosition="start"
            />
            <Tab 
              icon={<MemoryIcon fontSize={isMobile ? "small" : "medium"} />} 
              label={isMobile ? "" : "Dynamic LLM"}
              iconPosition="start"
            />
            <Tab 
              icon={<ImageIcon fontSize={isMobile ? "small" : "medium"} />} 
              label={isMobile ? "" : "Stable Diffusion"}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Panel - System Prompt */}
        {currentTab === 0 && (
          <Box>
            <Paper elevation={1} sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h6" gutterBottom>
                Custom System Prompt
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  O system prompt define como a IA deve se comportar. Deixe vazio para usar o comportamento padrão.
                </Typography>
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={isMobile ? 8 : 12}
                label="System Prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Exemplo: Você é um assistente prestativo e amigável. Sempre responda de forma clara e concisa..."
                helperText="Este prompt será enviado em todas as conversas para definir o comportamento da IA"
                sx={{ mb: 2 }}
              />

              <Box 
                display="flex" 
                gap={2} 
                alignItems={isMobile ? "stretch" : "center"}
                flexDirection={isMobile ? "column" : "row"}
              >
                <Button
                  variant="contained"
                  onClick={handleSaveSystemPrompt}
                  disabled={!hasPromptUnsavedChanges || isSavingPrompt}
                  startIcon={isSavingPrompt ? <CircularProgress size={16} /> : <CheckIcon />}
                  fullWidth={isMobile}
                >
                  {isSavingPrompt ? 'Salvando...' : 'Salvar System Prompt'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleResetSystemPrompt}
                  disabled={!systemPrompt}
                  startIcon={<DeleteIcon />}
                  fullWidth={isMobile}
                >
                  Limpar
                </Button>

                {promptSaveSuccess && (
                  <Chip
                    icon={<CheckIcon />}
                    label="Salvo com sucesso!"
                    color="success"
                    variant="outlined"
                    sx={{ width: isMobile ? '100%' : 'auto' }}
                  />
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                💡 Exemplos de System Prompts:
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  size={isMobile ? "small" : "small"}
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setSystemPrompt('Você é um assistente prestativo e amigável. Sempre responda de forma clara e concisa em português.')}
                >
                  Assistente Amigável
                </Button>
                <Button
                  size={isMobile ? "small" : "small"}
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setSystemPrompt('Você é um especialista técnico. Forneça respostas detalhadas e precisas, com exemplos de código quando apropriado.')}
                >
                  Especialista Técnico
                </Button>
                <Button
                  size={isMobile ? "small" : "small"}
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setSystemPrompt('Você é um professor paciente. Explique conceitos complexos de forma simples e didática, usando analogias quando possível.')}
                >
                  Professor
                </Button>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Tab Panel - LLM Parameters */}
        {currentTab === 1 && (
          <Box>
            <Paper elevation={1} sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h6" gutterBottom>
                Advanced LLM Parameters
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Ajuste fino dos parâmetros de geração da IA. Use valores padrão se não tiver certeza.
                </Typography>
              </Alert>

              <Grid container spacing={isMobile ? 2 : 3}>
                {/* Temperature */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Temperature: {llmConfig.temperature}
                  </Typography>
                  <Slider
                    value={llmConfig.temperature}
                    onChange={(e, value) => handleLlmConfigChange('temperature', value)}
                    min={0}
                    max={2}
                    step={0.1}
                    marks={isMobile ? [
                      { value: 0, label: '0' },
                      { value: 0.7, label: '0.7' },
                      { value: 2, label: '2' }
                    ] : [
                      { value: 0, label: '0 (Determinístico)' },
                      { value: 0.7, label: '0.7 (Balanceado)' },
                      { value: 1.5, label: '1.5 (Criativo)' },
                      { value: 2, label: '2 (Muito criativo)' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Controla a aleatoriedade. Valores baixos são mais focados e previsíveis.
                  </Typography>
                </Grid>

                {/* Max Tokens */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Max Tokens: {llmConfig.maxTokens}
                  </Typography>
                  <Slider
                    value={llmConfig.maxTokens}
                    onChange={(e, value) => handleLlmConfigChange('maxTokens', value)}
                    min={256}
                    max={8192}
                    step={256}
                    marks={isMobile ? [
                      { value: 512, label: '512' },
                      { value: 2048, label: '2K' },
                      { value: 8192, label: '8K' }
                    ] : [
                      { value: 512, label: '512' },
                      { value: 2048, label: '2K' },
                      { value: 4096, label: '4K' },
                      { value: 8192, label: '8K' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Comprimento máximo da resposta gerada.
                  </Typography>
                </Grid>

                {/* Top-K */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Top-K Sampling: {llmConfig.topK}
                  </Typography>
                  <Slider
                    value={llmConfig.topK}
                    onChange={(e, value) => handleLlmConfigChange('topK', value)}
                    min={1}
                    max={100}
                    step={1}
                    marks={isMobile ? [
                      { value: 1, label: '1' },
                      { value: 40, label: '40' },
                      { value: 100, label: '100' }
                    ] : [
                      { value: 1, label: '1' },
                      { value: 40, label: '40 (Padrão)' },
                      { value: 100, label: '100' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Limita a seleção aos K tokens mais prováveis.
                  </Typography>
                </Grid>

                {/* Top-P */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Top-P (Nucleus): {llmConfig.topP}
                  </Typography>
                  <Slider
                    value={llmConfig.topP}
                    onChange={(e, value) => handleLlmConfigChange('topP', value)}
                    min={0}
                    max={1}
                    step={0.05}
                    marks={isMobile ? [
                      { value: 0.5, label: '0.5' },
                      { value: 0.9, label: '0.9' },
                      { value: 1, label: '1.0' }
                    ] : [
                      { value: 0.5, label: '0.5' },
                      { value: 0.9, label: '0.9 (Padrão)' },
                      { value: 1, label: '1.0' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Probabilidade acumulada para seleção dinâmica de vocabulário.
                  </Typography>
                </Grid>

                {/* Frequency Penalty */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Frequency Penalty: {llmConfig.frequencyPenalty}
                  </Typography>
                  <Slider
                    value={llmConfig.frequencyPenalty}
                    onChange={(e, value) => handleLlmConfigChange('frequencyPenalty', value)}
                    min={0}
                    max={2}
                    step={0.1}
                    marks={isMobile ? [
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' }
                    ] : [
                      { value: 0, label: '0 (Sem)' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2 (Máx)' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Penaliza tokens repetidos baseado na frequência.
                  </Typography>
                </Grid>

                {/* Presence Penalty */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Presence Penalty: {llmConfig.presencePenalty}
                  </Typography>
                  <Slider
                    value={llmConfig.presencePenalty}
                    onChange={(e, value) => handleLlmConfigChange('presencePenalty', value)}
                    min={0}
                    max={2}
                    step={0.1}
                    marks={isMobile ? [
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' }
                    ] : [
                      { value: 0, label: '0 (Sem)' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2 (Máx)' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Penaliza tokens já usados, incentiva novos tópicos.
                  </Typography>
                </Grid>

                {/* Repeat Penalty */}
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Repeat Penalty (Ollama): {llmConfig.repeatPenalty}
                  </Typography>
                  <Slider
                    value={llmConfig.repeatPenalty}
                    onChange={(e, value) => handleLlmConfigChange('repeatPenalty', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    marks={isMobile ? [
                      { value: 0.5, label: '0.5' },
                      { value: 1.1, label: '1.1' },
                      { value: 2, label: '2.0' }
                    ] : [
                      { value: 0.5, label: '0.5' },
                      { value: 1.1, label: '1.1 (Padrão)' },
                      { value: 2, label: '2.0' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Penalidade de repetição específica do Ollama.
                  </Typography>
                </Grid>

                {/* Seed */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Seed (Opcional)"
                    type="number"
                    value={llmConfig.seed || ''}
                    onChange={(e) => handleLlmConfigChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
                    helperText="Para resultados reproduzíveis. Deixe vazio para aleatório."
                    placeholder="Ex: 42"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box 
                display="flex" 
                gap={2} 
                alignItems={isMobile ? "stretch" : "center"}
                flexDirection={isMobile ? "column" : "row"}
              >
                <Button
                  variant="contained"
                  onClick={handleSaveLlmConfig}
                  disabled={!hasLlmConfigUnsavedChanges || isSavingLlmConfig}
                  startIcon={isSavingLlmConfig ? <CircularProgress size={16} /> : <CheckIcon />}
                  fullWidth={isMobile}
                >
                  {isSavingLlmConfig ? 'Salvando...' : 'Salvar Configuração'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleResetLlmConfig}
                  startIcon={<RefreshIcon />}
                  fullWidth={isMobile}
                >
                  Restaurar Padrões
                </Button>

                {llmConfigSaveSuccess && (
                  <Chip
                    icon={<CheckIcon />}
                    label="Salvo com sucesso!"
                    color="success"
                    variant="outlined"
                    sx={{ width: isMobile ? '100%' : 'auto' }}
                  />
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                📚 Presets Recomendados:
              </Typography>
              
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setLlmConfig({
                    temperature: 0.3,
                    maxTokens: 2048,
                    topK: 20,
                    topP: 0.8,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                    repeatPenalty: 1.1,
                    seed: undefined
                  })}
                >
                  🎯 Preciso (Factual)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setLlmConfig({
                    temperature: 0.7,
                    maxTokens: 2048,
                    topK: 40,
                    topP: 0.9,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                    repeatPenalty: 1.1,
                    seed: undefined
                  })}
                >
                  ⚖️ Balanceado
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setLlmConfig({
                    temperature: 1.2,
                    maxTokens: 3072,
                    topK: 60,
                    topP: 0.95,
                    frequencyPenalty: 0.3,
                    presencePenalty: 0.3,
                    repeatPenalty: 1.2,
                    seed: undefined
                  })}
                >
                  🎨 Criativo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth={isMobile}
                  onClick={() => setLlmConfig({
                    temperature: 0.5,
                    maxTokens: 4096,
                    topK: 30,
                    topP: 0.85,
                    frequencyPenalty: 0.5,
                    presencePenalty: 0.2,
                    repeatPenalty: 1.3,
                    seed: undefined
                  })}
                >
                  💻 Código
                </Button>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Tab Panel - Ollama */}
        {currentTab === 2 && (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Status da Conexão Ollama */}
            {renderConnectionStatus()}

        {/* Configurações Básicas */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Configuração da Conexão
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={localConfig.enabled}
                  onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                />
              }
              label="Habilitar integração OLLAMA"
            />
          </Box>

          <TextField
            fullWidth
            label="URL do OLLAMA"
            value={localConfig.baseUrl}
            onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
            placeholder="http://localhost:11434"
            margin="normal"
            helperText="URL onde o serviço OLLAMA está rodando"
          />

          <TextField
            fullWidth
            label="Timeout (ms)"
            type="number"
            value={localConfig.timeout}
            onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
            margin="normal"
            helperText="Tempo limite para requisições em milissegundos"
            inputProps={{ min: 1000, max: 120000 }}
          />

          <Box display="flex" gap={2} mt={2}>
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={isTesting || !localConfig.baseUrl}
              startIcon={isTesting ? <CircularProgress size={16} /> : <SpeedIcon />}
            >
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>

            {hasUnsavedChanges && (
              <Button
                variant="contained"
                onClick={handleSaveConfig}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} /> : <CheckIcon />}
              >
                Salvar Configurações
              </Button>
            )}
          </Box>

          {renderTestResult()}
        </Paper>

        {/* Lista de Modelos */}
        <Paper elevation={1} sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              Modelos Disponíveis
            </Typography>
            <Tooltip title="Atualizar lista de modelos">
              <IconButton
                onClick={handleRefreshModels}
                disabled={isLoading || !serviceStatus?.isConnected}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress />
            </Box>
          ) : (
            renderModelsList()
          )}
        </Paper>
          </Box>
        )}

        {/* Tab Panel - Dynamic LLM */}
        {currentTab === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Dynamic LLM supports vLLM and LlamaCPP backends for high-performance inference.
                Configure model paths, GPU settings, and completion parameters.
              </Typography>
            </Alert>

            {/* Current Configuration */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Current Configuration
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Provider</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {dynamicLLMConfig.provider === 'vllm' ? 'vLLM' : 'LlamaCPP'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Device</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {dynamicLLMConfig.device?.toUpperCase() || 'CUDA'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Model Path</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {dynamicLLMConfig.model || 'Not configured'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Loaded Models</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {loadedModels.length}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Available Models</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {availableModels.length}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Action Buttons */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Management
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => setProviderSettingsOpen(true)}
                  fullWidth
                >
                  Configure Provider & Model
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<StorageIcon />}
                  onClick={() => setModelManagerOpen(true)}
                  fullWidth
                >
                  Manage Models & Downloads
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    fetchLoadedModels();
                    fetchAvailableModels();
                  }}
                  fullWidth
                >
                  Refresh Model Status
                </Button>
              </Box>
            </Paper>

            {/* Quick Tips */}
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Guide
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>vLLM:</strong> Use folder paths (e.g., <code>/models/qwen3-coder-30b</code>)
              </Typography>
              
              <Typography variant="body2" paragraph>
                <strong>LlamaCPP:</strong> Use .gguf file paths (e.g., <code>/models/qwen3-iq4xs/model.gguf</code>)
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Models are loaded automatically on first request and cached based on TTL settings.
                Download models from HuggingFace using the Model Manager.
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Tab Panel - Stable Diffusion */}
        {currentTab === 4 && (
          <Box>
            {sdError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {sdError}
              </Alert>
            )}

            {/* Status da Conexão SD */}
            {renderSdConnectionStatus()}

            {/* Configurações Básicas SD */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Configuração da Conexão
              </Typography>

              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSdConfig.enabled}
                      onChange={(e) => handleSdConfigChange('enabled', e.target.checked)}
                    />
                  }
                  label="Habilitar integração Stable Diffusion"
                />
              </Box>

              <TextField
                fullWidth
                label="URL do Stable Diffusion"
                value={localSdConfig.baseUrl}
                onChange={(e) => handleSdConfigChange('baseUrl', e.target.value)}
                placeholder="http://192.168.3.70:7861"
                margin="normal"
                helperText="URL onde o serviço Stable Diffusion está rodando"
              />

              <TextField
                fullWidth
                label="Token de Autenticação (Opcional)"
                value={localSdConfig.token || ''}
                onChange={(e) => handleSdConfigChange('token', e.target.value)}
                placeholder="Deixe vazio se não necessário"
                margin="normal"
                type="password"
                helperText="Token de autenticação para APIs SD que requerem auth"
                InputProps={{
                  autoComplete: 'new-password'
                }}
              />

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Modelo</InputLabel>
                    <Select
                      value={localSdConfig.model}
                      onChange={(e) => handleSdConfigChange('model', e.target.value)}
                      label="Modelo"
                    >
                      {sdModels.map((model) => (
                        <MenuItem key={model.model_name} value={model.model_name}>
                          {model.title}
                        </MenuItem>
                      ))}
                      {sdModels.length === 0 && (
                        <MenuItem value={localSdConfig.model}>
                          {localSdConfig.model}
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Sampler</InputLabel>
                    <Select
                      value={localSdConfig.sampler}
                      onChange={(e) => handleSdConfigChange('sampler', e.target.value)}
                      label="Sampler"
                    >
                      {StableDiffusionConfig.getAvailableSamplers().map((sampler) => (
                        <MenuItem key={sampler} value={sampler}>
                          {sampler}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <Typography gutterBottom>Steps: {localSdConfig.steps}</Typography>
                  <Slider
                    value={localSdConfig.steps}
                    onChange={(e, value) => handleSdConfigChange('steps', value)}
                    min={1}
                    max={150}
                    step={1}
                    marks={[
                      { value: 20, label: '20' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' }
                    ]}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography gutterBottom>CFG Scale: {localSdConfig.cfgScale}</Typography>
                  <Slider
                    value={localSdConfig.cfgScale}
                    onChange={(e, value) => handleSdConfigChange('cfgScale', value)}
                    min={1}
                    max={30}
                    step={0.5}
                    marks={[
                      { value: 7, label: '7' },
                      { value: 15, label: '15' }
                    ]}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Resolução</InputLabel>
                    <Select
                      value={`${localSdConfig.width}x${localSdConfig.height}`}
                      onChange={(e) => {
                        const [width, height] = e.target.value.split('x').map(Number);
                        handleResolutionChange({ width, height });
                      }}
                      label="Resolução"
                    >
                      {StableDiffusionConfig.getCommonResolutions().map((res) => (
                        <MenuItem key={`${res.width}x${res.height}`} value={`${res.width}x${res.height}`}>
                          {res.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Largura"
                    type="number"
                    value={localSdConfig.width}
                    onChange={(e) => handleSdConfigChange('width', parseInt(e.target.value))}
                    inputProps={{ min: 64, max: 2048, step: 64 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Altura"
                    type="number"
                    value={localSdConfig.height}
                    onChange={(e) => handleSdConfigChange('height', parseInt(e.target.value))}
                    inputProps={{ min: 64, max: 2048, step: 64 }}
                  />
                </Grid>
              </Grid>

              {/* Teste de Conexão SD */}
              <Box display="flex" alignItems="center" gap={2} mt={3}>
                <Button
                  variant="outlined"
                  onClick={handleSdTestConnection}
                  disabled={isSdTesting || !localSdConfig.baseUrl}
                  startIcon={isSdTesting ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                  {isSdTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleSaveSdConfig}
                  disabled={!hasSdUnsavedChanges}
                  color="primary"
                >
                  Salvar Configurações
                </Button>
              </Box>

              {/* Resultado do Teste SD */}
              {renderSdTestResult()}
            </Paper>

            {/* Modelos SD */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  Modelos Disponíveis
                </Typography>
                <Tooltip title="Atualizar lista de modelos">
                  <IconButton 
                    onClick={refreshSdModels}
                    disabled={sdIsLoading || !sdServiceStatus?.success}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {sdIsLoading ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress />
                </Box>
              ) : (
                renderSdModelsList()
              )}
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>

      {/* Dynamic LLM Provider Settings Dialog */}
      <ProviderSettingsDialog 
        open={providerSettingsOpen}
        onClose={() => setProviderSettingsOpen(false)}
      />

      {/* Dynamic LLM Model Manager Dialog */}
      <ModelManager 
        open={modelManagerOpen}
        onClose={() => setModelManagerOpen(false)}
      />
    </Dialog>
  );
};

export default SettingsDialog;
