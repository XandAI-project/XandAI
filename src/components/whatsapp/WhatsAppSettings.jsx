import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Slider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Security,
  Speed,
  Psychology,
  Tune
} from '@mui/icons-material';
import WhatsAppService from '../../application/services/WhatsAppService';

const WhatsAppSettings = ({ token, onUpdate }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      WhatsAppService.setToken(token);
    }
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WhatsAppService.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await WhatsAppService.updateConfig(config);
      setSuccess(true);
      if (onUpdate) onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Alert severity="error">
        Não foi possível carregar as configurações
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Configurações do WhatsApp AI
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Configurações salvas com sucesso!
        </Alert>
      )}

      {/* Persona e Estilo */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Psychology color="primary" />
            <Typography variant="subtitle1">Persona e Estilo</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tom de Voz"
                value={config.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                helperText="Ex: friendly, professional, casual, formal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Estilo"
                value={config.style}
                onChange={(e) => handleChange('style', e.target.value)}
                helperText="Ex: conversational, concise, detailed, humorous"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Idioma"
                value={config.language}
                onChange={(e) => handleChange('language', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Instruções Personalizadas"
                value={config.customInstructions || ''}
                onChange={(e) => handleChange('customInstructions', e.target.value)}
                helperText="Instruções adicionais para guiar o comportamento da IA"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Comportamento */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Speed color="primary" />
            <Typography variant="subtitle1">Comportamento</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.useTypingIndicator}
                    onChange={(e) => handleChange('useTypingIndicator', e.target.checked)}
                  />
                }
                label="Simular 'digitando...' (mais humano)"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                Delay de Resposta: {config.responseDelayMs}ms - {config.maxResponseDelayMs}ms
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={[config.responseDelayMs, config.maxResponseDelayMs]}
                  onChange={(e, newValue) => {
                    handleChange('responseDelayMs', newValue[0]);
                    handleChange('maxResponseDelayMs', newValue[1]);
                  }}
                  valueLabelDisplay="auto"
                  min={0}
                  max={30000}
                  step={500}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Contexto de Conversa (mensagens)"
                value={config.conversationContextLimit}
                onChange={(e) => handleChange('conversationContextLimit', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Segurança e Limites */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Security color="primary" />
            <Typography variant="subtitle1">Segurança e Limites</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ignoreGroups}
                    onChange={(e) => handleChange('ignoreGroups', e.target.checked)}
                  />
                }
                label="Ignorar mensagens de grupos"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ignoreMedia}
                    onChange={(e) => handleChange('ignoreMedia', e.target.checked)}
                  />
                }
                label="Ignorar mensagens com mídia"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Máx. Mensagens por Hora (total)"
                value={config.maxMessagesPerHour}
                onChange={(e) => handleChange('maxMessagesPerHour', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 1000 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Máx. Mensagens por Chat/Hora"
                value={config.maxMessagesPerChatPerHour}
                onChange={(e) => handleChange('maxMessagesPerChatPerHour', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contatos Bloqueados (separados por vírgula)"
                value={config.blockedContacts?.join(', ') || ''}
                onChange={(e) =>
                  handleChange(
                    'blockedContacts',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                helperText="Ex: 5511999999999, 5521888888888"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Palavras-chave Bloqueadas (separadas por vírgula)"
                value={config.blockedKeywords?.join(', ') || ''}
                onChange={(e) =>
                  handleChange(
                    'blockedKeywords',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                helperText="Mensagens contendo estas palavras serão ignoradas"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Modelo IA */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Tune color="primary" />
            <Typography variant="subtitle1">Configurações do Modelo IA</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Modelo Padrão"
                value={config.defaultModel}
                onChange={(e) => handleChange('defaultModel', e.target.value)}
                helperText="Ex: llama3.2, mistral, gpt-4"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Tokens"
                value={config.maxTokens}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                inputProps={{ min: 50, max: 4000, step: 50 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                Temperature: {config.temperature.toFixed(2)}
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={config.temperature}
                  onChange={(e, newValue) => handleChange('temperature', newValue)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={2}
                  step={0.1}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Menor = mais consistente | Maior = mais criativo
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Botão Salvar */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </Box>
    </Box>
  );
};

export default WhatsAppSettings;
