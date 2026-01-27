import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { Refresh, QrCode2 } from '@mui/icons-material';

const WhatsAppQrCode = ({ qrCode, onRefresh }) => {
  if (!qrCode) {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Gerando QR Code...
        </Typography>
      </Paper>
    );
  }

  if (qrCode.status === 'connected') {
    return (
      <Alert severity="success" sx={{ mb: 3 }}>
        ✅ WhatsApp conectado com sucesso!
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <QrCode2 sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Conectar WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {qrCode.message || 'Escaneie o QR Code abaixo com seu WhatsApp'}
        </Typography>

        {qrCode.qrCode ? (
          <Box>
            <Box
              sx={{
                display: 'inline-block',
                p: 2,
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: 2
              }}
            >
              <img
                src={qrCode.qrCode}
                alt="QR Code WhatsApp"
                style={{ display: 'block', maxWidth: '300px', width: '100%' }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, mb: 2 }}>
              📱 <strong>Como conectar:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div" sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
              <ol style={{ paddingLeft: 20 }}>
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong>Menu</strong> ou <strong>Configurações</strong></li>
                <li>Toque em <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Aponte seu celular para esta tela para capturar o código</li>
              </ol>
            </Typography>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onRefresh}
              sx={{ mt: 3 }}
            >
              Atualizar QR Code
            </Button>
          </Box>
        ) : (
          <Box>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Aguardando QR Code...
            </Typography>
            <Button
              variant="text"
              startIcon={<Refresh />}
              onClick={onRefresh}
              sx={{ mt: 2 }}
            >
              Tentar novamente
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default WhatsAppQrCode;
