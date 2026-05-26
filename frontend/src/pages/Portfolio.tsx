import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { exportToExcel } from "@/utils/export";
import { PortfolioTitleSection } from "@/components/portfolio/portfolio-header";
import { PortfolioToolbar } from "@/components/portfolio/portfolio-toolbar";
import { PortfolioTable, type Titulo, type TituloStatus } from "@/components/portfolio/portfolio-table";
import { tituloService } from "@/services/tituloService";
import { useToast } from "@/components/ui/use-toast";

export default function Portfolio() {
  const location = useLocation();
  const { toast } = useToast();
  
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TituloStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Atualizar filtro de status baseado na URL (vindo do Dashboard)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status === "VERIFIED" || status === "PENDING" || status === "COMPROMISED") {
      setStatusFilter(status as TituloStatus);
    } else {
      setStatusFilter("all");
    }
  }, [location.search]);

  // Efeito principal para buscar dados com paginação e filtros via Backend
  useEffect(() => {
    const fetchTitulos = async () => {
      setIsLoading(true);
      try {
        const response = await tituloService.getTitulos({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm || undefined,
          status: statusFilter === "all" ? undefined : statusFilter
        });
        setTitulos(response.data);
        setTotalItems(response.meta.totalItems);
        setTotalPages(response.meta.totalPages);
      } catch (error) {
        toast({
          title: "Erro de Comunicação",
          description: "Falha ao carregar a lista de títulos do servidor.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce de 300ms para evitar spam de chamadas na API enquanto digita
    const timeoutId = setTimeout(() => {
      fetchTitulos();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, toast]);

  const handleExportExcel = () => {
    // Para Task 6.1: Atualizado para exportar usando a abstração genérica
    exportToExcel(titulos, "Portfolio", "ProofChain_Portfolio.xlsx");
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Resetar paginação ao buscar
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as TituloStatus | "all");
    setCurrentPage(1); // Resetar paginação ao filtrar
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6">
          <PortfolioTitleSection onExport={handleExportExcel} disabledExport={titulos.length === 0} statusFilter={statusFilter} />

          <PortfolioToolbar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
          />

          <div className={isLoading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
            <PortfolioTable
              titulos={titulos}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
