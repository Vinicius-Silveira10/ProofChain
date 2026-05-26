import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  // Se não estiver autenticado, intercepta e redireciona para a tela de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, permite a renderização das rotas filhas
  return <Outlet />;
}
