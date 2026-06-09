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

/**
 * DTO tipado rigorosamente conforme contrato do backend.
 * Campos: snake_case, tipos exatos (valor em centavos como inteiro).
 */
export interface EmitirTituloDTO {
  cnpj_emissor: string;      // 14 dígitos numéricos sem máscara — validado pelo algoritmo de checksum
  credor: string;            // 3-200 caracteres
  valor_centavos: number;    // inteiro em centavos (ex: R$ 12,34 → 1234)
  data_vencimento: string;   // YYYY-MM-DD (formato nativo do input type=date)
  // Nota: o campo "motivo" pertence ao modelo Installment (parcela), NÃO ao TituloDivida
}

/** Parcela real vinda da API (mapeada do backend Installment) */
export interface InstallmentItem {
  id: string;
  tituloId: string;
  numero: number;
  valor: number;             // em reais (centavos/100)
  vencimento: string;        // ISO date string
  motivo: string | null;
  autorizadoPor: string | null;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  dataPagamento: string | null;
  paidBy: string | null;
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
      meta: response.data.meta,
    };
  },

  /**
   * Busca as métricas consolidadas para os KPIs do Dashboard
   */
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const response = await api.get<any>('/dashboard/metrics');
    const data = response.data;

    return {
      totalCustodia: data.total_centavos ? data.total_centavos / 100 : 0,
      titulosAtivos: data.total_titulos_ativos || 0,
      integridadePercentual: data.percentual_integridade || 0,
      alertasFraude: data.total_titulos_comprometidos || 0,
      chartEmissoes: data.emissoes_30_dias
        ? data.emissoes_30_dias.map((emissao: any) => ({
            date: emissao.data,
            emissoes: emissao.quantidade,
          }))
        : [],
      chartIntegridade: data.distribuicao_integridade
        ? [
            { name: 'Verificados', value: data.distribuicao_integridade.verificados || 0, color: '#10b981' },
            { name: 'Pendentes', value: data.distribuicao_integridade.pendentes || 0, color: '#f59e0b' },
            { name: 'Comprometidos', value: data.distribuicao_integridade.comprometidos || 0, color: '#ef4444' },
          ].filter((item) => item.value > 0)
        : [],
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
      tipoPagamento: 'Pix',
      dataEmissao: item.createdAt,
      status: item.integrity_status,
      dbHash: item.hash_integridade,
      blockchainHash: item.hash_integridade,
      txHash: item.tx_hash,
      blockTimestamp: item.createdAt,
      parcelas: item.installments
        ? item.installments.map((p: any) => ({
            id: p.id,
            tituloId: p.tituloDividaId,
            numero: p.numero_parcela,
            valor: Number(p.valor_centavos) / 100,
            vencimento: p.data_vencimento_parcela,
            status:
              p.status_parcela === 'PAGO'
                ? 'PAGA'
                : p.status_parcela === 'PENDENTE'
                ? 'PENDENTE'
                : 'ATRASADA',
          }))
        : [],
    };
  },

  /**
   * Busca as parcelas reais de um título pelo ID.
   * GET /api/titulos/:id/installments
   */
  getInstallments: async (tituloId: string): Promise<InstallmentItem[]> => {
    const response = await api.get<any[]>(`/titulos/${tituloId}/installments`);
    return response.data.map((p: any) => ({
      id: p.id,
      tituloId: p.tituloDividaId,
      numero: p.numero_parcela,
      valor: Number(p.valor_centavos) / 100,
      vencimento: p.data_vencimento_parcela,
      motivo: p.motivo || null,
      autorizadoPor: p.autorizado_por || null,
      status: p.status_parcela as 'PENDENTE' | 'PAGO' | 'VENCIDO',
      dataPagamento: p.data_hora_pagamento || null,
      paidBy: p.usuario_pagamento?.name || null,
    }));
  },

  /**
   * Confirma o pagamento de uma parcela específica.
   * PATCH /api/installments/:installmentId/pay
   */
  confirmarPagamento: async (installmentId: string): Promise<InstallmentItem> => {
    const response = await api.patch<any>(`/installments/${installmentId}/pay`);
    const p = response.data;
    return {
      id: p.id,
      tituloId: p.tituloDividaId,
      numero: p.numero_parcela,
      valor: Number(p.valor_centavos) / 100,
      vencimento: p.data_vencimento_parcela,
      motivo: p.motivo || null,
      autorizadoPor: p.autorizado_por || null,
      status: p.status_parcela as 'PENDENTE' | 'PAGO' | 'VENCIDO',
      dataPagamento: p.data_hora_pagamento || null,
      paidBy: p.usuario_pagamento?.name || null,
    };
  },

  /**
   * Envia um novo título para ancoragem na Blockchain
   */
  criarTitulo: async (
    payload: EmitirTituloDTO,
    idempotencyKey: string
  ): Promise<{ id: string; status: string; message: string }> => {
    const response = await api.post('/titulos', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data;
  },
};
