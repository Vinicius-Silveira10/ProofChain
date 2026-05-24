import { Link } from "react-router-dom";
import { Plus, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortfolioHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-slate-900" />
          <span className="text-xl font-semibold tracking-tight text-slate-900">
            ProofChain
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/portfolio"
            className="text-sm font-medium text-slate-900"
          >
            Portfólio
          </Link>
          <Link
            to="/auditoria"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Auditoria
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PortfolioTitleSection({ onExport }: { onExport?: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Títulos sob Custódia
        </h1>
        <p className="mt-1 text-slate-500">
          Gerencie e audite todos os passivos registrados no sistema.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2" onClick={onExport}>
          <Download className="h-4 w-4" />
          Exportar para Excel
        </Button>
        <Button asChild>
          <Link to="/emissao">
            <Plus className="mr-2 h-4 w-4" />
            Nova Emissão
          </Link>
        </Button>
      </div>
    </div>
  );
}

