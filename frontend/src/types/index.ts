// Tipagens Exatas baseadas no Prisma Schema e no Documento de Mapeamento de Integração

export type Role = 'ADMINISTRADOR' | 'AUDITOR' | 'OPERADOR' | 'ADMIN' | 'OPERATOR';
export type StatusUsuario = 'ATIVO' | 'REVOGADO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  status: StatusUsuario;
  createdAt: string;
  updatedAt: string;
}

export type StatusTitulo = 'VERIFIED' | 'PENDING' | 'COMPROMISED' | 'FAILED_ON_CHAIN';

export interface Titulo {
  id: string;
  uuid: string;
  cnpjEmissor: string;
  credor: string;
  valorTotal: number;
  tipoPagamento: string;
  dataEmissao: string;
  status: StatusTitulo;
  dbHash: string;
  blockchainHash?: string | null;
  txHash?: string | null;
  blockTimestamp?: string | null;
}


export interface LogAuditoria {
  id: string;
  dataHora: string;
  usuarioId?: string | null;
  usuario?: Usuario | null;
  acao: string;
  entidadeId?: string | null;
  enderecoIp: string;
  detalhes?: any;
}

// Resposta Paginada Padrão
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}
