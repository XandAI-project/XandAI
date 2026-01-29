/**
 * Serviço de autenticação para comunicação com a API backend
 */
class AuthService {
  constructor() {
    // Use environment variable for API URL - supports network access
    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.baseURL = `${API_BASE}/api/v1`;
    this.tokenKey = 'xandai_auth_token';
    
    // Log API URL in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Auth Service API URL:', this.baseURL);
    }
    this.userKey = 'xandai_user_data';
  }

  /**
   * Registra um novo usuário
   * @param {Object} userData - Dados do usuário
   * @returns {Promise<Object>} - Dados do usuário e token
   */
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao registrar usuário');
      }

      const data = await response.json();
      this.setAuthData(data);
      return data;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  }

  /**
   * Realiza login do usuário
   * @param {Object} credentials - Email e senha
   * @returns {Promise<Object>} - Dados do usuário e token
   */
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Credenciais inválidas');
      }

      const data = await response.json();
      this.setAuthData(data);
      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  /**
   * Obtém o perfil do usuário autenticado
   * @returns {Promise<Object>} - Dados do perfil
   */
  async getProfile() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          throw new Error('Sessão expirada');
        }
        throw new Error('Erro ao obter perfil');
      }

      const userData = await response.json();
      this.setUserData(userData);
      return userData;
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      throw error;
    }
  }

  /**
   * Atualiza o perfil do usuário
   * @param {Object} profileData - Dados do perfil a serem atualizados
   * @returns {Promise<Object>} - Dados atualizados
   */
  async updateProfile(profileData) {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }

      const userData = await response.json();
      this.setUserData(userData);
      return userData;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  /**
   * Altera a senha do usuário
   * @param {Object} passwordData - Senha atual e nova senha
   * @returns {Promise<void>}
   */
  async changePassword(passwordData) {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${this.baseURL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  /**
   * Verifica se o token é válido
   * @returns {Promise<boolean>} - Se o token é válido
   */
  async verifyToken() {
    try {
      const token = this.getToken();
      if (!token) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      if (data.valid && data.user) {
        this.setUserData(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Realiza logout do usuário
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean} - Se está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Obtém o token armazenado
   * @returns {string|null} - Token ou null
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Obtém os dados do usuário armazenados
   * @returns {Object|null} - Dados do usuário ou null
   */
  getCurrentUser() {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Armazena os dados de autenticação
   * @param {Object} authData - Dados de autenticação (user, accessToken)
   * @private
   */
  setAuthData(authData) {
    localStorage.setItem(this.tokenKey, authData.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(authData.user));
  }

  /**
   * Armazena apenas os dados do usuário
   * @param {Object} userData - Dados do usuário
   * @private
   */
  setUserData(userData) {
    localStorage.setItem(this.userKey, JSON.stringify(userData));
  }

  /**
   * Obtém headers com autorização para requisições
   * @returns {Object} - Headers com token
   */
  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Interceptor para requisições com tratamento de erro de autenticação
   * @param {string} url - URL da requisição
   * @param {Object} options - Opções da requisição
   * @returns {Promise<Response>} - Response da requisição
   */
  async authenticatedFetch(url, options = {}) {
    const token = this.getToken();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      this.logout();
      window.location.href = '/login';
      throw new Error('Sessão expirada');
    }

    return response;
  }
}

// Exporta uma instância singleton
const authService = new AuthService();
export default authService;
