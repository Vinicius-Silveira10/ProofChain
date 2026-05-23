import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Wallet, CheckCircle, ShieldAlert, AlertTriangle } from 'lucide-react';

interface DashboardMetrics {
  total_ativos_reais: string;
  total_titulos_ativos: number;
  total_titulos_comprometidos: number;
  percentual_integridade: number;
  emissoes_30_dias: Array<{ data: string; quantidade: number; valor_reais: string }>;
  distribuicao_integridade: {
    verificados: number;
    comprometidos: number;
    pendentes: number;
  };
  ultima_varredura: {
    executada_em: string;
    total_verificados: number;
    anomalias_detectadas: number;
  };
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/api/dashboard/metrics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('Erro ao buscar métricas', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-medium">Extraindo métricas agregadas da rede...</div>;
  }

  if (!metrics) {
    return <div className="p-12 text-center text-red-500 font-bold">Falha de conexão com o banco de dados.</div>;
  }

  const pieData = [
    { name: 'Íntegros', value: metrics.distribuicao_integridade.verificados, color: '#10B981' }, // Verde
    { name: 'Comprometidos', value: metrics.distribuicao_integridade.comprometidos, color: '#EF4444' }, // Vermelho
    { name: 'Pendentes (Off-chain)', value: metrics.distribuicao_integridade.pendentes, color: '#9CA3AF' } // Cinza
  ];

  const integrityColor = metrics.percentual_integridade >= 95 
    ? 'text-green-600' : metrics.percentual_integridade >= 80 
    ? 'text-yellow-500' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4 pb-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Centro de Comando</h1>
          <p className="text-gray-500 font-medium mt-1">Visão C-Level do Ecossistema Financeiro e Saúde Criptográfica</p>
        </div>

        {/* 4 Cards Superiores (Grid 2x2 ou 1x4) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Custodiado</p>
                <h3 className="text-3xl font-black text-gray-900 mt-2 tracking-tighter">{metrics.total_ativos_reais}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Títulos Ativos</p>
                <h3 className="text-3xl font-black text-gray-900 mt-2">{metrics.total_titulos_ativos}</h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Saúde Criptográfica</p>
                <h3 className={`text-3xl font-black mt-2 ${integrityColor}`}>{metrics.percentual_integridade}%</h3>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-bold text-red-500/80 uppercase tracking-wider">Alertas de Fraude</p>
                <h3 className="text-3xl font-black text-red-600 mt-2">{metrics.total_titulos_comprometidos}</h3>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            {metrics.total_titulos_comprometidos > 0 && (
              <div className="absolute inset-0 bg-red-50/50" />
            )}
          </div>

        </div>

        {/* Gráficos Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bar Chart - Emissões */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
            <h3 className="text-lg font-black text-gray-900 mb-6 tracking-tight">Evolução de Emissões (30 Dias)</h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.emissoes_30_dias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="data" 
                    tickFormatter={(tick) => {
                      const d = new Date(tick);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 p-4 rounded-xl shadow-xl text-white text-sm">
                            <p className="font-bold mb-1">{new Date(label).toLocaleDateString('pt-BR')}</p>
                            <p className="text-gray-300">Títulos Emitidos: <span className="text-blue-400 font-bold">{payload[0].value}</span></p>
                            <p className="text-gray-300">Volume Bruto: <span className="text-green-400 font-bold">{payload[0].payload.valor_reais}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="quantidade" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Saúde */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-lg font-black text-gray-900 mb-6 tracking-tight">Radar de Integridade</h3>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const percentage = metrics.total_titulos_ativos === 0 ? 0 : Math.round((data.value / metrics.total_titulos_ativos) * 100);
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm font-bold">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                              <span className="text-gray-700">{data.name}: {data.value}</span>
                            </div>
                            <div className="text-gray-400 mt-1 ml-5">{percentage}% do portfólio</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Rodapé de Status */}
        <div className="text-center pt-8 border-t border-gray-200/60">
          <p className="text-sm font-medium text-gray-500">
            Última varredura de integridade do oráculo executada em: <strong className="text-gray-800">{new Date(metrics.ultima_varredura.executada_em).toLocaleString('pt-BR')}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {metrics.ultima_varredura.total_verificados} títulos em custódia ativa. {metrics.ultima_varredura.anomalias_detectadas} anomalias sistêmicas atestadas.
          </p>
        </div>

      </div>
    </div>
  );
}
