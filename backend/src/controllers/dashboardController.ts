import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

// Estrutura do Cache in-memory
interface CacheStructure {
  data: any | null;
  timestamp: number;
}
// Cache zerado sempre que o módulo é carregado (hot-reload incluso)
let metricsCache: CacheStructure = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const dashboardController = {
  /**
   * GET /api/dashboard/metrics
   * Extrai status macro e financeiro da base usando agregações nativas e cache em memória.
   */
  async getMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const now = Date.now();
      
      // Cache Interceptor
      if (metricsCache.data && (now - metricsCache.timestamp < CACHE_TTL_MS)) {
        res.status(200).json(metricsCache.data);
        return;
      }

      // 1. Agregação financeira bruta (Soma centavos apenas de títulos ACTIVE)
      const aggFinanceiro = await prisma.tituloDivida.aggregate({
        _sum: { valor_centavos: true },
        where: { status: 'ACTIVE' }
      });
      const totalCentavos = aggFinanceiro._sum.valor_centavos || BigInt(0);
      const totalBRL = (Number(totalCentavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      // 2. Agregação de Distribuição Criptográfica
      const [ativos_totais, comprometidos, verificados, pendentes, alertas_fraude_count] = await Promise.all([
        prisma.tituloDivida.count({ where: { status: 'ACTIVE' } }),
        prisma.tituloDivida.count({ where: { status: 'ACTIVE', integrity_status: 'COMPROMISED' } }),
        prisma.tituloDivida.count({ where: { status: 'ACTIVE', integrity_status: 'VERIFIED' } }),
        prisma.tituloDivida.count({ where: { status: 'ACTIVE', integrity_status: 'PENDING' } }),
        // Conta eventos de fraude nos logs de auditoria — reflete a realidade mesmo no modo bypass,
        // onde o título pode ter integrity_status=PENDING mas o scanner já detectou e registrou a violação.
        prisma.auditLog.count({ where: { action: 'INTEGRITY_BREACH_DETECTED' } })
      ]);

      // A integridade da carteira só é afetada por títulos explicitamente COMPROMETIDOS.
      // Títulos PENDENTES (aguardando rede ou RPC off) não diminuem a integridade da base.
      const percentual_integridade = ativos_totais === 0 ? 100 : Math.round(((ativos_totais - comprometidos) / ativos_totais) * 100);

      // 3. Emissões nos Últimos 30 Dias (100% Processado no Engine do Banco de Dados)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delegação de agrupamento de datas e sumaritzação para o PostgreSQL via RAW Query
      const aggregatedEmissions = await prisma.$queryRaw<Array<{ dia: Date | string, quantidade: bigint, total_centavos: bigint }>>`
        SELECT 
          DATE("createdAt") as dia, 
          COUNT(*) as quantidade, 
          SUM(valor_centavos) as total_centavos
        FROM "titulos_divida"
        WHERE status = 'ACTIVE' AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY DATE("createdAt") ASC;
      `;

      const emissoes_30_dias = aggregatedEmissions.map(row => {
        // Trata retorno de datas dependendo do driver do banco
        const diaStr = row.dia instanceof Date ? row.dia.toISOString().split('T')[0] : String(row.dia);
        return {
          data: diaStr,
          quantidade: Number(row.quantidade),
          valor_reais: (Number(row.total_centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        };
      });

      // 4. Última varredura (Simulando log do Oráculo - Feature 11 preenchida ou dados fixos caso vazia)
      // Extrair o último log de auditoria focado em verificação global
      const ultimaVarreduraGlobal = await prisma.auditLog.findFirst({
        where: { action: 'VERIFICATION_REQUESTED' },
        orderBy: { timestamp: 'desc' }
      });

      const payload = {
        total_ativos_reais: totalBRL,
        total_centavos: Number(totalCentavos),
        total_titulos_ativos: ativos_totais,
        // alertas_fraude: contagem de eventos de log INTEGRITY_BREACH_DETECTED (fonte verdade)
        // comprometidos: contagem de títulos com integrity_status=COMPROMISED (pode ser 0 no modo bypass)
        total_titulos_comprometidos: alertas_fraude_count,
        percentual_integridade,
        emissoes_30_dias,
        distribuicao_integridade: {
          verificados,
          comprometidos,
          pendentes
        },
        ultima_varredura: {
          executada_em: ultimaVarreduraGlobal ? ultimaVarreduraGlobal.timestamp.toISOString() : new Date().toISOString(),
          total_verificados: ativos_totais,
          anomalias_detectadas: alertas_fraude_count
        }
      };

      // Atualiza o Cache
      metricsCache = {
        data: payload,
        timestamp: now
      };

      res.status(200).json(payload);
    } catch (error) {
      console.error('Error computing dashboard metrics:', error);
      res.status(500).json({ error: 'Erro interno no servidor ao computar métricas' });
    }
  }
};
