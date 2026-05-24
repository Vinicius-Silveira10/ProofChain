import { Link } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TituloStatus = "VERIFIED" | "PENDING" | "COMPROMISED";

export interface Titulo {
  id: string;
  uuid: string;
  credor: string;
  cnpj: string;
  valorTotal: number;
  dataEmissao: string;
  status: TituloStatus;
}

interface PortfolioTableProps {
  titulos: Titulo[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const statusConfig: Record<
  TituloStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  VERIFIED: {
    label: "Íntegro",
    icon: ShieldCheck,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PENDING: {
    label: "Pendente",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  COMPROMISED: {
    label: "Alerta de Fraude",
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR");
}

function shortenUUID(uuid: string): string {
  return `${uuid.slice(0, 8)}...`;
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function PortfolioTable({
  titulos,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PortfolioTableProps) {
  const itemsPerPage = 10;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700">UUID</TableHead>
            <TableHead className="font-semibold text-slate-700">
              Credor
            </TableHead>
            <TableHead className="font-semibold text-slate-700">CNPJ</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">
              Valor Total
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Emissão
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Status On-chain
            </TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {titulos.map((titulo) => {
            const config = statusConfig[titulo.status];
            const StatusIcon = config.icon;
            const isCompromised = titulo.status === "COMPROMISED";

            return (
              <TableRow
                key={titulo.id}
                className={
                  isCompromised
                    ? "bg-red-50/50 hover:bg-red-50"
                    : "hover:bg-slate-50"
                }
              >
                <TableCell className="font-mono text-sm text-slate-600">
                  {shortenUUID(titulo.uuid)}
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {titulo.credor}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatCNPJ(titulo.cnpj)}
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900">
                  {formatCurrency(titulo.valorTotal)}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatDate(titulo.dataEmissao)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${config.className} gap-1.5`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/titulo/${titulo.id}`}>
                      <Eye className="mr-1.5 h-4 w-4" />
                      Ver Detalhes
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <p className="text-sm text-slate-500">
          Mostrando{" "}
          <span className="font-medium text-slate-700">{startItem}</span> a{" "}
          <span className="font-medium text-slate-700">{endItem}</span> de{" "}
          <span className="font-medium text-slate-700">{totalItems}</span>{" "}
          resultados
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-slate-200"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-slate-200"
          >
            Próxima
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
