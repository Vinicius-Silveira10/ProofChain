import axios from 'axios';
import { toast } from '@/components/ui/use-toast';

// Usando import.meta.env do Vite em vez do process.env do CRA para compatibilidade
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Task 5.2 Bypass: Não injetar token em rotas públicas
  const isPublicRoute = config.url?.includes('/public/');
  
  if (token && config.headers && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicRoute = error.config?.url?.includes('/public/');
    
    if (error.response && error.response.status === 401 && !isPublicRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (!error.response || error.response.status >= 500) {
      console.error('Serviço Temporariamente Indisponível - Tente Novamente', error);
      toast({
        title: "Serviço Indisponível",
        description: "Falha de comunicação com o servidor. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
    return Promise.reject(error);
  }
);

export default api;
