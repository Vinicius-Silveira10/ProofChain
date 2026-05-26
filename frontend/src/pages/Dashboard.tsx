import { useState, useEffect } from "react";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { EmissionsChart } from "@/components/dashboard/emissions-chart";
import { IntegrityChart } from "@/components/dashboard/integrity-chart";
import { FooterStatus } from "@/components/dashboard/footer-status";
import { tituloService } from "@/services/tituloService";
import type { DashboardMetrics } from "@/services/tituloService";
import { useToast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const data = await tituloService.getDashboardMetrics();
        if (isMounted) setMetrics(data);
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Erro ao carregar Dashboard",
            description: "Não foi possível carregar as métricas neste momento.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col bg-background">

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Painel de Integridade do Portfólio
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão macro dos ativos sob custódia e status de auditoria on-chain.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="mb-8">
            <MetricsGrid data={metrics} isLoading={isLoading} />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <EmissionsChart data={metrics?.chartEmissoes} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-4">
              <IntegrityChart data={metrics?.chartIntegridade} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </main>

      <FooterStatus />
    </div>
  );
}
