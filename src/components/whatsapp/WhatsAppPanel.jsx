import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  QrCode2,
  PhoneAndroid,
  PowerSettingsNew,
  Pause,
  PlayArrow,
  Settings,
  Message,
  Refresh,
  SmartToy
} from '@mui/icons-material';
import WhatsAppService from '../../application/services/WhatsAppService';
import WhatsAppQrCode from './WhatsAppQrCode';
import WhatsAppMessages from './WhatsAppMessages';
import WhatsAppSettings from './WhatsAppSettings';

const WhatsAppPanel = ({ token }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Configurar token no serviço
  useEffect(() => {
    if (token) {
      WhatsAppService.setToken(token);
    }
  }, [token]);

  // Carregar status inicial
  const loadStatus = useCallback(async () => {
    try {
      setError(null);
      const statusData = await WhatsAppService.getStatus();
      setStatus(statusData);
      
      // Se está aguardando QR, buscar QR code
      if (statusData.status === 'qr_ready' || statusData.status === 'disconnected') {
        const qrData = await WhatsAppService.getQrCode();
        setQrCode(qrData);
      } else {
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao carregar status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Auto-refresh quando aguardando conexão
  useEffect(() => {
    if (status && (status.status === 'qr_ready' || status.status === 'connecting')) {
      const interval = setInterval(loadStatus, 3000); // Verificar a cada 3s
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [status, loadStatus, refreshInterval]);

  // Iniciar sessão
  const handleStartSession = async () => {
    try {
      setLoading(true);
      setError(null);
      await WhatsAppService.startSession(true);
      await loadStatus();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Desconectar
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await WhatsAppService.disconnect();
      await loadStatus();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Toggle Pause (Kill Switch)
  const handleTogglePause = async () => {
    try {
      setError(null);
      await WhatsAppService.togglePause();
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle Auto-Reply
  const handleToggleAutoReply = async () => {
    try {
      setError(null);
      await WhatsAppService.toggleAutoReply();
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
  };

  // Renderizar status badge
  const renderStatusBadge = () => {
    if (!status) return null;

    const statusConfig = {
      connected: { color: 'success', label: 'Conectado', icon: <PhoneAndroid /> },
      authenticated: { color: 'success', label: 'Autenticado', icon: <PhoneAndroid /> },
      qr_ready: { color: 'warning', label: 'Aguardando QR', icon: <QrCode2 /> },
      connecting: { color: 'info', label: 'Conectando...', icon: <CircularProgress size={16} /> },
      disconnected: { color: 'default', label: 'Desconectado', icon: <PowerSettingsNew /> },
      expired: { color: 'error', label: 'Expirado', icon: <PowerSettingsNew /> },
      error: { color: 'error', label: 'Erro', icon: <PowerSettingsNew /> },
    };

    const config = statusConfig[status.status] || statusConfig.disconnected;

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="medium"
        sx={{ fontSize: '1rem', py: 2.5 }}
      />
    );
  };

  if (loading && !status) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneAndroid color="primary" />
              WhatsApp AI Integration
            </Typography>
            {renderStatusBadge()}
          </Grid>

          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Botão Conectar/Desconectar */}
              {!status?.isConnected ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStartSession}
                  startIcon={<QrCode2 />}
                  disabled={loading}
                >
                  Conectar WhatsApp
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  startIcon={<PowerSettingsNew />}
                  disabled={loading}
                >
                  Desconectar
                </Button>
              )}

              {/* Kill Switch */}
              {status?.isConnected && (
                <Tooltip title="Pausar/Retomar respostas automáticas">
                  <Button
                    variant={status.isPaused ? 'contained' : 'outlined'}
                    color={status.isPaused ? 'success' : 'warning'}
                    onClick={handleTogglePause}
                    startIcon={status.isPaused ? <PlayArrow /> : <Pause />}
                  >
                    {status.isPaused ? 'Retomar' : 'Pausar'}
                  </Button>
                </Tooltip>
              )}

              {/* Refresh */}
              <Tooltip title="Atualizar status">
                <IconButton onClick={loadStatus} color="primary">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* Info adicional quando conectado */}
        {status?.isConnected && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Número
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {status.phoneNumber || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={status.autoReplyEnabled}
                      onChange={handleToggleAutoReply}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <SmartToy fontSize="small" />
                      Auto-Reply
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Total de Mensagens
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {status.messageCount || 0}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Última Atividade
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {status.lastActiveAt
                    ? new Date(status.lastActiveAt).toLocaleString('pt-BR')
                    : 'Nunca'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Alertas */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {status?.isPaused && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            ⏸️ Auto-Reply está PAUSADO. Mensagens não estão sendo respondidas automaticamente.
          </Alert>
        )}
      </Paper>

      {/* QR Code Section */}
      {qrCode && (qrCode.status === 'qr_ready' || qrCode.qrCode) && (
        <WhatsAppQrCode qrCode={qrCode} onRefresh={loadStatus} />
      )}

      {/* Tabs */}
      {status?.isConnected && (
        <Paper elevation={3} sx={{ mt: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab icon={<Message />} label="Mensagens" />
            <Tab icon={<Settings />} label="Configurações" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && <WhatsAppMessages token={token} />}
            {activeTab === 1 && <WhatsAppSettings token={token} onUpdate={loadStatus} />}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default WhatsAppPanel;
