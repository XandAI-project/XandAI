import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  CallReceived,
  CallMade,
  SmartToy,
  Person,
  Refresh
} from '@mui/icons-material';
import WhatsAppService from '../../application/services/WhatsAppService';

const WhatsAppMessages = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const limit = 20;

  useEffect(() => {
    if (token) {
      WhatsAppService.setToken(token);
    }
  }, [token]);

  const loadMessages = async (currentPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await WhatsAppService.getMessages(currentPage, limit);
      setMessages(data.messages || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(page);
  }, [page]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      sent: 'success',
      delivered: 'info',
      read: 'primary',
      failed: 'error',
      pending: 'warning',
      processing: 'info',
      ignored: 'default'
    };
    return colors[status] || 'default';
  };

  if (loading && messages.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (messages.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          Nenhuma mensagem ainda. As mensagens aparecerão aqui quando forem recebidas ou enviadas.
        </Typography>
      </Box>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Histórico de Mensagens ({total})
        </Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={() => loadMessages(page)} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <List sx={{ bgcolor: 'background.paper' }}>
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            <ListItem
              alignItems="flex-start"
              sx={{
                bgcolor: message.direction === 'incoming' ? 'grey.50' : 'primary.50',
                borderLeft: message.direction === 'incoming' ? '4px solid' : '4px solid',
                borderColor: message.direction === 'incoming' ? 'info.main' : 'success.main',
                mb: 1,
                borderRadius: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                {message.direction === 'incoming' ? (
                  <CallReceived color="info" />
                ) : (
                  <CallMade color="success" />
                )}
              </Box>

              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="subtitle2">
                      {message.direction === 'incoming' ? (
                        <>
                          <Person fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          {message.contactName || message.contactNumber || 'Desconhecido'}
                        </>
                      ) : (
                        <>
                          <SmartToy fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          Você (AI)
                        </>
                      )}
                    </Typography>
                    <Chip
                      label={message.status}
                      size="small"
                      color={getStatusColor(message.status)}
                    />
                    {message.isAIGenerated && (
                      <Chip
                        label="IA"
                        size="small"
                        color="secondary"
                        icon={<SmartToy />}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{ display: 'block', mt: 1, mb: 1 }}
                    >
                      {message.content}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary">
                      {message.direction === 'incoming'
                        ? formatDate(message.receivedAt)
                        : formatDate(message.sentAt)}
                    </Typography>
                    {message.metadata && message.metadata.model && (
                      <Chip
                        label={`Modelo: ${message.metadata.model}`}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                  </>
                }
              />
            </ListItem>
            {index < messages.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

export default WhatsAppMessages;
