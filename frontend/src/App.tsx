import { BrowserRouter, Routes, Route } from "react-router-dom";

import VerificadorPublico from "@/pages/VerificadorPublico";
import Dashboard from "@/pages/Dashboard";
import Emissao from "@/pages/Emissao";
import Auditoria from "@/pages/Auditoria";
import Login from "@/pages/Login";
import Portfolio from "@/pages/Portfolio";
import TituloDetalhes from "@/pages/TituloDetalhes";
import Usuarios from "@/pages/Usuarios";
import { AuthLayout } from "@/components/layout/auth-layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/layout/error-boundary";

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<VerificadorPublico />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas Protegidas (Exigem Login) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/emissao" element={<Emissao />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/titulo/:id" element={<TituloDetalhes />} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
