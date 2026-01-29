// Use environment variable for API URL (supports network access)
// Default to localhost as fallback
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE}/api/v1`;

// Log API URL on service initialization (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('📡 WhatsApp Service API URL:', API_URL);
}

class WhatsAppService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Inicia sessão WhatsApp e gera QR Code
   */
  async startSession(autoReplyEnabled = true) {
    const response = await fetch(`${API_URL}/whatsapp/start`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ autoReplyEnabled }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao iniciar sessão WhatsApp');
    }

    return await response.json();
  }

  /**
   * Obtém status da conexão
   */
  async getStatus() {
    const response = await fetch(`${API_URL}/whatsapp/status`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao obter status da conexão');
    }

    return await response.json();
  }

  /**
   * Obtém QR Code
   */
  async getQrCode() {
    const response = await fetch(`${API_URL}/whatsapp/qr`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao obter QR Code');
    }

    return await response.json();
  }

  /**
   * Desconecta sessão WhatsApp
   */
  async disconnect() {
    const response = await fetch(`${API_URL}/whatsapp/disconnect`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao desconectar WhatsApp');
    }

    return await response.json();
  }

  /**
   * Pausa/Retoma auto-reply (Kill Switch)
   */
  async togglePause() {
    const response = await fetch(`${API_URL}/whatsapp/toggle-pause`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao alternar pausa');
    }

    return await response.json();
  }

  /**
   * Ativa/Desativa auto-reply
   */
  async toggleAutoReply() {
    const response = await fetch(`${API_URL}/whatsapp/toggle-auto-reply`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao alternar auto-reply');
    }

    return await response.json();
  }

  /**
   * Obtém configurações
   */
  async getConfig() {
    const response = await fetch(`${API_URL}/whatsapp/config`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Erro ao obter configurações');
    }

    return await response.json();
  }

  /**
   * Atualiza configurações
   */
  async updateConfig(config) {
    const response = await fetch(`${API_URL}/whatsapp/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao atualizar configurações');
    }

    return await response.json();
  }

  /**
   * Obtém mensagens
   */
  async getMessages(page = 1, limit = 50) {
    const response = await fetch(
      `${API_URL}/whatsapp/messages?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao obter mensagens');
    }

    return await response.json();
  }
}

export default new WhatsAppService();
