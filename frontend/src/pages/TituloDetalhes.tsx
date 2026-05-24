import { useParams } from "react-router-dom";
import { BreadcrumbHeader } from "@/components/titulo/breadcrumb-header";
import { ResumoFinanceiro } from "@/components/titulo/resumo-financeiro";
import { TabelaParcelas } from "@/components/titulo/tabela-parcelas";

export default function TituloDetalhes() {
  // const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <BreadcrumbHeader />
        
        <ResumoFinanceiro
          credor="Fornecedor Tech S/A"
          cnpj="12.345.678/0001-95"
          valorTotal="R$ 45.000.000,00"
          dataEmissao="15/01/2026"
        />
        
        <TabelaParcelas />
      </div>
    </main>
  );
}
