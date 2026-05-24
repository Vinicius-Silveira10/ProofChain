import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BreadcrumbHeader() {
  return (
    <div className="mb-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a listagem
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Detalhes do Título de Dívida
        </h1>
        <Badge className="bg-success text-success-foreground gap-1.5 px-3 py-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Íntegro (Blockchain Validada)
        </Badge>
      </div>
    </div>
  );
}

