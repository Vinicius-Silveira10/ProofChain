import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * BUG-007 corrigido: Badge de status removido daqui.
 * O status real do título é exibido diretamente na página TituloDetalhes.tsx
 * (linhas 141-158), onde temos acesso ao objeto `titulo` com o status real.
 * Manter um badge hardcoded aqui causaria exibição "Íntegro" mesmo em títulos
 * com COMPROMISED ou PENDING.
 */
export function BreadcrumbHeader() {
  return (
    <div className="mb-8">
      <Link
        to="/portfolio"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao Portfólio
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">
        Detalhes do Título de Dívida
      </h1>
    </div>
  );
}
