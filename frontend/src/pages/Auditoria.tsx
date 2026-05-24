import { useState } from "react";
import { Shield, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FiltrosAuditoria } from "@/components/auditoria/filtros-auditoria";
import { TabelaLogs, type LogEntry } from "@/components/auditoria/tabela-logs";

// Dados mock para demonstração
const mockLogs: LogEntry[] = [
  {
    id: "1",
    dataHora: "23/05/2026 14:32:15",
    usuario: "admin@proofchain.com",
    acao: "TITLE_CREATED",
    entidadeId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    enderecoIp: "192.168.1.105",
  },
  {
    id: "2",
    dataHora: "23/05/2026 14:28:40",
    usuario: "financeiro@empresa.com.br",
    acao: "INSTALLMENT_PAID",
    entidadeId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    enderecoIp: "10.0.0.45",
  },
  {
    id: "3",
    dataHora: "23/05/2026 13:45:22",
    usuario: "system@proofchain.internal",
    acao: "INTEGRITY_BREACH_DETECTED",
    entidadeId: "9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    enderecoIp: "127.0.0.1",
  },
  {
    id: "4",
    dataHora: "23/05/2026 12:15:08",
    usuario: "auditor@empresa.com.br",
    acao: "USER_LOGIN",
    entidadeId: "-",
    enderecoIp: "187.45.123.78",
  },
  {
    id: "5",
    dataHora: "23/05/2026 11:50:33",
    usuario: "admin@proofchain.com",
    acao: "BLOCKCHAIN_ANCHORED",
    entidadeId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    enderecoIp: "192.168.1.105",
  },
  {
    id: "6",
    dataHora: "23/05/2026 10:22:17",
    usuario: "operador@empresa.com.br",
    acao: "TITLE_CREATED",
    entidadeId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    enderecoIp: "10.0.0.67",
  },
  {
    id: "7",
    dataHora: "23/05/2026 09:45:55",
    usuario: "financeiro@empresa.com.br",
    acao: "INSTALLMENT_PAID",
    entidadeId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    enderecoIp: "10.0.0.45",
  },
  {
    id: "8",
    dataHora: "22/05/2026 18:30:41",
    usuario: "admin@proofchain.com",
    acao: "TITLE_REMOVED",
    entidadeId: "d4e5f6a7-b8c9-0123-defa-234567890123",
    enderecoIp: "192.168.1.105",
  },
  {
    id: "9",
    dataHora: "22/05/2026 16:12:29",
    usuario: "system@proofchain.internal",
    acao: "INTEGRITY_BREACH_DETECTED",
    entidadeId: "e5f6a7b8-c9d0-1234-efab-345678901234",
    enderecoIp: "127.0.0.1",
  },
  {
    id: "10",
    dataHora: "22/05/2026 14:05:18",
    usuario: "auditor@empresa.com.br",
    acao: "USER_LOGIN",
    entidadeId: "-",
    enderecoIp: "187.45.123.78",
  },
];

export default function Auditoria() {
  const [currentPage, setCurrentPage] = useState(1);
  const [logs] = useState<LogEntry[]>(mockLogs);

  const handleFilterChange = (filters: {
    uuid: string;
    acao: string;
    dataInicio: Date | undefined;
    dataFim: Date | undefined;
  }) => {
    // Aqui seria feita a chamada à API com os filtros
    console.log("Filtros aplicados:", filters);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(logs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, "ProofChain_Auditoria.xlsx");
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
          <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            Exportar para Excel
          </Button>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <FiltrosAuditoria onFilterChange={handleFilterChange} />
        </div>

        {/* Tabela de Logs */}
        <TabelaLogs
          logs={logs}
          currentPage={currentPage}
          totalResults={245}
          resultsPerPage={10}
          onPageChange={setCurrentPage}
        />
      </main>
    </div>
  );
}
