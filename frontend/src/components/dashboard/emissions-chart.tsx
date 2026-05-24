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

const data = [
  { date: "01/05", emissoes: 4 },
  { date: "03/05", emissoes: 7 },
  { date: "05/05", emissoes: 3 },
  { date: "07/05", emissoes: 8 },
  { date: "09/05", emissoes: 5 },
  { date: "11/05", emissoes: 12 },
  { date: "13/05", emissoes: 6 },
  { date: "15/05", emissoes: 9 },
  { date: "17/05", emissoes: 11 },
  { date: "19/05", emissoes: 7 },
  { date: "21/05", emissoes: 15 },
  { date: "23/05", emissoes: 10 },
];

export function EmissionsChart() {
  return (
    <Card className="rounded-md shadow-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Emissões nos Últimos 30 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
        </div>
      </CardContent>
    </Card>
  );
}
