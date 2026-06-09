import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Shield, Download } from "lucide-react";
import { exportToExcel } from "@/utils/export";
import { Button } from "@/components/ui/button";
import { FiltrosAuditoria } from "@/components/auditoria/filtros-auditoria";
import { TabelaLogs, type LogEntry } from "@/components/auditoria/tabela-logs";
import { auditoriaService } from "@/services/auditoriaService";
import { useToast } from "@/components/ui/use-toast";

export default function Auditoria() {
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [filtros, setFiltros] = useState<{
    uuid?: string;
    acao?: string;
    dataInicio?: string;
    dataFim?: string;
  }>(() => {
    // Inicializa os filtros baseado nos query params da URL
    const params = new URLSearchParams(location.search);
    const acaoParam = params.get("acao");
    return {
      acao: acaoParam ? acaoParam : undefined
    };
  });

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await auditoriaService.getLogs({
          page: currentPage,
          limit: 10,
          ...filtros
        });
        
        if (isMounted) {
          const mappedLogs: LogEntry[] = response.data.map((log) => ({
            id: log.id,
            // Formatar dataHora vindo da API
            dataHora: new Date(log.dataHora).toLocaleString('pt-BR'),
            // usuario pode vir como objeto na resposta
            usuario: log.usuario?.nome || log.usuario?.email || 'Sistema',
            acao: log.acao,
            entidadeId: log.entidadeId || '-',
            enderecoIp: log.enderecoIp || '-',
            detalhes: log.detalhes,
          }));
          
          setLogs(mappedLogs);
          setTotalResults(response.meta.totalItems);
        }
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Erro ao carregar auditoria",
            description: "Não foi possível carregar os logs do servidor.",
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [currentPage, filtros, toast]);

  const handleFilterChange = (novosFiltros: {
    uuid: string;
    acao: string;
    dataInicio: Date | undefined;
    dataFim: Date | undefined;
  }) => {
    setFiltros({
      uuid: novosFiltros.uuid || undefined,
      acao: novosFiltros.acao !== "all" ? novosFiltros.acao : undefined,
      dataInicio: novosFiltros.dataInicio ? novosFiltros.dataInicio.toISOString() : undefined,
      dataFim: novosFiltros.dataFim ? novosFiltros.dataFim.toISOString() : undefined,
    });
    setCurrentPage(1); // Reseta a paginação ao filtrar
  };

  const handleExportExcel = () => {
    // Na Task 6.1 aprimoraremos isso. Por hora exporta o que está na tela
    exportToExcel(logs, "Auditoria", "ProofChain_Auditoria.xlsx");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Título da Página */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Logs de Auditoria
              </h1>
              <p className="text-sm text-muted-foreground">
                Rastreio imutável de ações, alertas de integridade e acessos.
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleExportExcel}
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar para Excel
          </Button>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <FiltrosAuditoria onFilterChange={handleFilterChange} initialAcao={filtros.acao} />
        </div>

        {/* Tabela de Logs */}
        <div className={isLoading ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
          <TabelaLogs
            logs={logs}
            currentPage={currentPage}
            totalResults={totalResults}
            resultsPerPage={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>
    </div>
  );
}
