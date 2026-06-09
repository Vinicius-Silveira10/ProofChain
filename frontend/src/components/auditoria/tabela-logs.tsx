import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  dataHora: string;
  usuario: string;
  acao: string;
  entidadeId: string;
  enderecoIp: string;
  detalhes?: any;
}

interface TabelaLogsProps {
  logs: LogEntry[];
  currentPage: number;
  totalResults: number;
  resultsPerPage: number;
  onPageChange: (page: number) => void;
}

const acaoLabels: Record<string, string> = {
  TITLE_CREATED: "Título Criado",
  INSTALLMENT_PAID: "Parcela Paga",
  INTEGRITY_BREACH_DETECTED: "Violação de Integridade Detectada",
  USER_LOGIN: "Login de Usuário",
  TITLE_REMOVED: "Título Removido",
  BLOCKCHAIN_ANCHORED: "Ancorado na Blockchain",
};

export function TabelaLogs({
  logs,
  currentPage,
  totalResults,
  resultsPerPage,
  onPageChange,
}: TabelaLogsProps) {
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startResult = (currentPage - 1) * resultsPerPage + 1;
  const endResult = Math.min(currentPage * resultsPerPage, totalResults);

  const isBreachAction = (acao: string) => acao === "INTEGRITY_BREACH_DETECTED";

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px]">Data/Hora</TableHead>
            <TableHead className="w-[180px]">Usuário/Ator</TableHead>
            <TableHead>Ação Realizada</TableHead>
            <TableHead className="w-[280px]">Entidade (ID do Título)</TableHead>
            <TableHead className="w-[140px]">Endereço IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              className={cn(
                isBreachAction(log.acao) &&
                  "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30"
              )}
            >
              <TableCell className="font-mono text-sm text-muted-foreground">
                {log.dataHora}
              </TableCell>
              <TableCell className="font-medium">
                {log.usuario}
                {isBreachAction(log.acao) && log.detalhes?.suspect && (
                  <div className="mt-1 flex items-center">
                    <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-900/40 dark:text-red-400">
                      Suspeito: {log.detalhes.suspect.name}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isBreachAction(log.acao) && "font-semibold text-red-600"
                  )}
                >
                  {isBreachAction(log.acao) && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  {acaoLabels[log.acao] || log.acao}
                </div>
              </TableCell>
              <TableCell>
                <code
                  className={cn(
                    "rounded bg-muted px-1.5 py-0.5 font-mono text-xs",
                    isBreachAction(log.acao) &&
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {log.entidadeId}
                </code>
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {log.enderecoIp}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginação */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">{startResult}</span> a{" "}
          <span className="font-medium text-foreground">{endResult}</span> de{" "}
          <span className="font-medium text-foreground">{totalResults}</span>{" "}
          resultados
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Próxima
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
