import { Landmark, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "alert";
  href?: string;
}

function MetricCard({ title, value, icon, variant = "default", href }: MetricCardProps) {
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
          <p className={`text-2xl font-bold tracking-tight ${valueStyles[variant]}`}>
            {value}
          </p>
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

export function MetricsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Sob Custódia"
        value="R$ 1.240.000,00"
        icon={<Landmark className="size-6 text-muted-foreground" />}
        href="/portfolio"
      />
      <MetricCard
        title="Títulos Ativos"
        value="142"
        icon={<FileText className="size-6 text-muted-foreground" />}
        href="/portfolio?status=VERIFIED"
      />
      <MetricCard
        title="Integridade da Carteira"
        value="100%"
        variant="success"
        icon={<ShieldCheck className="size-6 text-success" />}
        href="/auditoria"
      />
      <MetricCard
        title="Alertas de Fraude"
        value="2"
        variant="alert"
        icon={<AlertTriangle className="size-6 text-alert" />}
        href="/auditoria"
      />
    </div>
  );
}
