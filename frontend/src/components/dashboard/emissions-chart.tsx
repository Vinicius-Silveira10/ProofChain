import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmissaoChartData } from "@/services/tituloService";

interface EmissionsChartProps {
  data?: EmissaoChartData[];
  isLoading?: boolean;
}

export function EmissionsChart({ data, isLoading }: EmissionsChartProps) {
  // Fallback para quando os dados não chegarem da API ainda e não estiver em loading
  const chartData = data || [];

  return (
    <Card className="rounded-md shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Emissões nos Últimos 30 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 600 }}
              />
              <Bar 
                dataKey="emissoes" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                activeBar={{ fill: '#2563eb' }}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
