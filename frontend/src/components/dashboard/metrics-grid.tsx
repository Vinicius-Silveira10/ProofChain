import { Landmark, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics } from "@/services/tituloService";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "alert";
  href?: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, icon, variant = "default", href, isLoading }: MetricCardProps) {
  const variantStyles = {
    default: "bg-card",
    success: "bg-card",
    alert: "bg-red-50",
  };

  const valueStyles = {
    default: "text-foreground",
    success: "text-success",
    alert: "text-alert",
  };

  const cardContent = (
    <Card className={`${variantStyles[variant]} rounded-md shadow-sm border-border ${href ? 'hover:bg-slate-50 transition-colors cursor-pointer' : ''}`}>
      <CardContent className="flex items-center justify-between py-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className={`text-2xl font-bold tracking-tight ${valueStyles[variant]}`}>
              {value}
            </p>
          )}
        </div>
        <div className="flex size-12 items-center justify-center rounded-md bg-muted">
          {icon}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{cardContent}</Link>;
  }

  return cardContent;
}

interface MetricsGridProps {
  data?: DashboardMetrics;
  isLoading?: boolean;
}

export function MetricsGrid({ data, isLoading }: MetricsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Sob Custódia"
        value={data ? formatCurrency(data.totalCustodia) : "R$ 0,00"}
        icon={<Landmark className="size-6 text-muted-foreground" />}
        href="/portfolio"
        isLoading={isLoading}
      />
      <MetricCard
        title="Títulos Ativos"
        value={data ? String(data.titulosAtivos) : "0"}
        icon={<FileText className="size-6 text-muted-foreground" />}
        href="/portfolio?status=VERIFIED"
        isLoading={isLoading}
      />
      <MetricCard
        title="Integridade da Carteira"
        value={data ? `${data.integridadePercentual}%` : "0%"}
        variant="success"
        icon={<ShieldCheck className="size-6 text-success" />}
        href="/auditoria"
        isLoading={isLoading}
      />
      <MetricCard
        title="Alertas de Fraude"
        value={data ? String(data.alertasFraude) : "0"}
        variant={data && data.alertasFraude > 0 ? "alert" : "default"}
        icon={<AlertTriangle className={data && data.alertasFraude > 0 ? "size-6 text-alert" : "size-6 text-muted-foreground"} />}
        href="/auditoria?acao=INTEGRITY_BREACH_DETECTED"
        isLoading={isLoading}
      />
    </div>
  );
}
