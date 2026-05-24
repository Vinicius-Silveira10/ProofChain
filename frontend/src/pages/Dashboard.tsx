import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { EmissionsChart } from "@/components/dashboard/emissions-chart";
import { IntegrityChart } from "@/components/dashboard/integrity-chart";
import { FooterStatus } from "@/components/dashboard/footer-status";

export default function Dashboard() {
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
            <MetricsGrid />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <EmissionsChart />
            </div>
            <div className="lg:col-span-4">
              <IntegrityChart />
            </div>
          </div>
        </div>
      </main>

      <FooterStatus />
    </div>
  );
}
