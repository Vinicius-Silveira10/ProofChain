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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VerificadorPublico />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<AuthLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/emissao" element={<Emissao />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/titulo/:id" element={<TituloDetalhes />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
