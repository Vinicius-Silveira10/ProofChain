import api from './api';
import type { PaginatedResponse, LogAuditoria } from '../types';

export interface GetAuditoriaParams {
  page?: number;
  limit?: number;
  uuid?: string;
  acao?: string;
  dataInicio?: string;
  dataFim?: string;
}

export const auditoriaService = {
  /**
   * Busca a lista paginada de logs de auditoria
   */
  getLogs: async (params?: GetAuditoriaParams): Promise<PaginatedResponse<LogAuditoria>> => {
    // Mapeando os parâmetros que o frontend usa para os que o backend espera
    const backendParams = {
      page: params?.page,
      limit: params?.limit,
      tituloDividaId: params?.uuid,
      action: params?.acao,
      startDate: params?.dataInicio,
      endDate: params?.dataFim
    };

    const response = await api.get<PaginatedResponse<any>>('/audit-logs', { params: backendParams });
    
    // Mapeando de AuditLog (Backend) para LogAuditoria (Frontend)
    const mappedData = response.data.data.map((log: any) => ({
      id: log.id,
      dataHora: log.timestamp,
      usuarioId: log.userId,
      usuario: log.user ? {
        id: log.userId,
        nome: log.user.name,
        email: log.user.email,
        role: log.user.role,
        status: 'ATIVO',
        createdAt: '',
        updatedAt: ''
      } : null,
      acao: log.action,
      entidadeId: log.tituloDividaId,
      enderecoIp: log.clientIp
    }));

    return {
      data: mappedData,
      meta: response.data.meta
    };
  },
};
