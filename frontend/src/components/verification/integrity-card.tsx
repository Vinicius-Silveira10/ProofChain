import { XCircle, FileSearch, ShieldCheck, Clock, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type VerificationStatus = "VERIFIED" | "COMPROMISED" | "PENDING" | "REMOVED";

export interface TitleData {
  uuid: string;
  creditor: string;
  value: string;
  dueDate: string;
  issueDate: string;
  status: VerificationStatus;
}

interface IntegrityCardProps {
  data: TitleData;
  onOpenForensic: () => void;
}

const STATUS_CONFIG = {
  VERIFIED: {
    icon: ShieldCheck,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-700",
    textColor: "text-emerald-600",
    title: "INTEGRIDADE VERIFICADA",
    description: "— Registro íntegro na blockchain",
  },
  COMPROMISED: {
    icon: XCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-500",
    titleColor: "text-red-700",
    textColor: "text-red-600",
    title: "ALERTA DE FRAUDE",
    description: "— Dados adulterados detectados",
  },
  PENDING: {
    icon: Clock,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-500",
    titleColor: "text-amber-700",
    textColor: "text-amber-600",
    title: "VERIFICAÇÃO PENDENTE",
    description: "— Aguardando confirmação na blockchain",
  },
  REMOVED: {
    icon: Trash2,
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
    iconColor: "text-slate-500",
    titleColor: "text-slate-700",
    textColor: "text-slate-600",
    title: "TÍTULO REMOVIDO",
    description: "— Este registro foi excluído do sistema",
  },
};

const DEFAULT_CONFIG = STATUS_CONFIG.PENDING;

export function IntegrityCard({ data, onOpenForensic }: IntegrityCardProps) {
  const normalizedStatus = (data.status?.toUpperCase() ?? "") as VerificationStatus;
  const config = STATUS_CONFIG[normalizedStatus] ?? DEFAULT_CONFIG;
  const StatusIcon = config.icon;


  return (
    <Card className="mx-auto max-w-2xl border-border shadow-sm">
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className={`flex items-center gap-3 rounded-md px-4 py-3 border ${config.bgColor} ${config.borderColor}`}>
          <StatusIcon className={`size-6 shrink-0 ${config.iconColor}`} />
          <div>
            <span className={`font-semibold uppercase tracking-wide text-sm ${config.titleColor}`}>
              {config.title}
            </span>
            <span className={`ml-2 text-sm ${config.textColor}`}>
              {config.description}
            </span>
          </div>
        </div>

        {/* Title Data */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              UUID do Título
            </p>
            <p className="mt-1 font-mono text-sm text-foreground break-all">
              {data.uuid}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Credor
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {data.creditor}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Valor
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {data.value}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vencimento
            </p>
            <p className="mt-1 text-sm text-foreground">
              {data.dueDate}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Data de Emissão
            </p>
            <p className="mt-1 text-sm text-foreground">
              {data.issueDate}
            </p>
          </div>
        </div>

        {/* Forensic Button - only show for VERIFIED or COMPROMISED */}
        {(data.status === "VERIFIED" || data.status === "COMPROMISED") && (
          <div className="border-t border-border pt-4" data-html2canvas-ignore="true">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={onOpenForensic}
            >
              <FileSearch className="size-4" />
              Abrir Trilha Forense
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
