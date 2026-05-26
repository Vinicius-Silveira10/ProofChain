import api from './api';
import type { Usuario } from '../types';

interface LoginCredentials {
  email: string;
  senha?: string; // Dependendo do payload do backend
  password?: string;
}

interface LoginResponse {
  token: string;
  user: Usuario;
}

export const authService = {
  /**
   * Realiza o login na API e armazena os dados de sessão
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // A rota exata de login pode variar, assumiremos /auth/login
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  /**
   * Limpa os dados de sessão
   */
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Retorna os dados do usuário logado (com a role)
   */
  getCurrentUser: (): Usuario | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as Usuario;
    } catch {
      return null;
    }
  },

  /**
   * Verifica se há um token armazenado
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  }
};
