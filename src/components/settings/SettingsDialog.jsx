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
  Slider
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
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { useOllama } from '../../application/hooks/useOllama';
import { useStableDiffusion } from '../../application/hooks/useStableDiffusion';
import { StableDiffusionConfig } from '../../domain/entities/StableDiffusionConfig';

/**
 * OLLAMA and Stable Diffusion settings dialog
 * @param {Object} props - Component properties
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback to close
 * @returns {JSX.Element}
 */
const SettingsDialog = ({ open, onClose }) => {
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
      PaperProps={{
        sx: { minHeight: '70vh' }
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
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab 
              icon={<SmartToyIcon />} 
              label="Ollama" 
              iconPosition="start"
            />
            <Tab 
              icon={<ImageIcon />} 
              label="Stable Diffusion" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Panel - Ollama */}
        {currentTab === 0 && (
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

        {/* Tab Panel - Stable Diffusion */}
        {currentTab === 1 && (
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
    </Dialog>
  );
};

export default SettingsDialog;
