import api from './api';
import type { Titulo, PaginatedResponse } from '../types';

export interface EmissaoChartData {
  date: string;
  emissoes: number;
}

export interface IntegrityChartData {
  name: string;
  value: number;
  color: string;
}

export interface DashboardMetrics {
  totalCustodia: number;
  titulosAtivos: number;
  integridadePercentual: number;
  alertasFraude: number;
  chartEmissoes?: EmissaoChartData[];
  chartIntegridade?: IntegrityChartData[];
}

export interface GetTitulosParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const tituloService = {
  /**
   * Busca a lista paginada de títulos, com suporte a filtros dinâmicos
   */
  getTitulos: async (params?: GetTitulosParams): Promise<PaginatedResponse<Titulo>> => {
    const response = await api.get<PaginatedResponse<any>>('/titulos', { params });
    
    // Mapear de TituloDivida (Backend) para Titulo (Frontend)
    const mappedData = response.data.data.map((item: any) => ({
      id: item.id,
      uuid: item.id, // O uuid do frontend corresponde ao id do backend
      cnpj: item.cnpj_emissor,
      cnpjEmissor: item.cnpj_emissor,
      credor: item.credor,
      valorTotal: Number(item.valor_centavos) / 100, // Converte centavos para reais
      dataEmissao: item.createdAt,
      status: item.integrity_status, // O badge de status usa a integridade criptográfica
    }));

    return {
      data: mappedData,
      meta: response.data.meta
    };
  },

  /**
   * Busca as métricas consolidadas para os KPIs do Dashboard
   */
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const response = await api.get<any>('/dashboard/metrics');
    const data = response.data;
    
    // Mapeamento explícito de payload Backend -> Frontend DashboardMetrics
    return {
      totalCustodia: data.total_centavos ? data.total_centavos / 100 : 0,
      titulosAtivos: data.total_titulos_ativos || 0,
      integridadePercentual: data.percentual_integridade || 0,
      alertasFraude: data.total_titulos_comprometidos || 0,
      chartEmissoes: data.emissoes_30_dias ? data.emissoes_30_dias.map((emissao: any) => ({
        date: emissao.data,
        emissoes: emissao.quantidade
      })) : [],
      chartIntegridade: data.distribuicao_integridade ? [
        { name: "Verificados", value: data.distribuicao_integridade.verificados || 0, color: "#10b981" },
        { name: "Pendentes", value: data.distribuicao_integridade.pendentes || 0, color: "#f59e0b" },
        { name: "Comprometidos", value: data.distribuicao_integridade.comprometidos || 0, color: "#ef4444" }
      ].filter(item => item.value > 0) : [] // Apenas exibe fatias maiores que 0 no gráfico
    };
  },
  
  /**
   * Busca os detalhes de um título específico pelo seu ID interno
   */
  getTituloById: async (id: string): Promise<Titulo> => {
    const response = await api.get<any>(`/titulos/${id}`);
    const item = response.data;
    return {
      id: item.id,
      uuid: item.id,
      cnpjEmissor: item.cnpj_emissor,
      credor: item.credor,
      valorTotal: Number(item.valor_centavos) / 100,
      tipoPagamento: 'Pix', // Ou derivado se houver
      dataEmissao: item.createdAt,
      status: item.integrity_status,
      dbHash: item.hash_integridade,
      blockchainHash: item.hash_integridade, // ou do onchain data
      txHash: item.tx_hash,
      blockTimestamp: item.createdAt, // aproximado
      parcelas: item.installments ? item.installments.map((p: any) => ({
        id: p.id,
        tituloId: p.tituloDividaId,
        numero: p.numero_parcela,
        valor: Number(p.valor_centavos) / 100,
        vencimento: p.data_vencimento_parcela,
        status: p.status_parcela === 'PAGO' ? 'PAGA' : (p.status_parcela === 'PENDENTE' ? 'PENDENTE' : 'ATRASADA')
      })) : []
    };
  },

  /**
   * Envia um novo título para ancoragem na Blockchain (Task 4.1)
   */
  criarTitulo: async (
    payload: Omit<Titulo, 'id' | 'uuid' | 'status' | 'dbHash' | 'blockchainHash' | 'txHash' | 'blockTimestamp' | 'parcelas' | 'dataEmissao'>,
    idempotencyKey: string
  ): Promise<{ id: string; status: string; message: string }> => {
    const response = await api.post('/titulos', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  }
};
