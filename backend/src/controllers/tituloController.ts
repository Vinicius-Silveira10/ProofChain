import { Request, Response } from 'express';
import { TituloService, ValidationError } from '../services/tituloService';
import { prisma } from '../config/prisma';
import { initProvider, getHashFromChain } from '../services/blockchainService';
import { verifyTituloIntegrity } from '../services/verificationService';
import { AuthRequest } from '../middleware/auth';
import { extractClientIp } from '../middleware/auditLog';

// Instanciar o service de forma lazy com blindagem anti-crash
// Se a blockchain falhar no boot (chave inválida, RPC down), o servidor
// continua respondendo — apenas a rota de criação retorna 503.
let _tituloService: TituloService | null = null;

function getTituloService(): TituloService {
  if (_tituloService) return _tituloService;
  try {
    _tituloService = new TituloService(prisma, initProvider());
    return _tituloService;
  } catch (bootErr: any) {
    // Log no boot mas não derruba o processo
    console.error('[CONTROLLER BOOT] Falha ao inicializar BlockchainService:', bootErr?.message ?? bootErr);
    throw new Error('BLOCKCHAIN_UNAVAILABLE');
  }
}

export const tituloController = {
  /**
   * POST /api/titulos
   */
  async createTitulo(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Validação de presença e tipo do valor_centavos
      // BigInt("1234.56") lanca SyntaxError — devemos rejeitar floats aqui
      const rawValor = req.body.valor_centavos;
      if (rawValor === undefined || rawValor === null) {
        res.status(400).json({ error: 'valor_centavos é obrigatório' });
        return;
      }
      if (typeof rawValor === 'number' && !Number.isInteger(rawValor)) {
        res.status(400).json({ error: 'valor_centavos deve ser um número inteiro (sem casas decimais). Ex: R$ 12,34 = 1234.' });
        return;
      }

      let valorCentavos: bigint;
      try {
        valorCentavos = BigInt(rawValor);
      } catch {
        res.status(400).json({ error: 'valor_centavos inválido — não é um inteiro válido.' });
        return;
      }

      const input = {
        cnpj_emissor: req.body.cnpj_emissor,
        credor: req.body.credor,
        valor_centavos: valorCentavos,
        data_vencimento: new Date(req.body.data_vencimento),
      };

      const ctx = {
        userId: req.user.id,
        clientIp: extractClientIp(req),
      };

      const titulo = await getTituloService().create(input, ctx);

      res.status(201).json(titulo);
    } catch (error: any) {
      // Task 1: Log estruturado — nunca deixar o erro passar sem rastreio
      console.error('[ERRO CRÍTICO - POST /titulos]', {
        message: error?.message,
        code:    error?.code,
        name:    error?.name,
        userId:  req.user?.id,
        body:    { ...req.body, cnpj_emissor: req.body.cnpj_emissor?.slice(0, 4) + '***' }, // ofusca parcialmente
      });

      if (error.message === 'BLOCKCHAIN_UNAVAILABLE') {
        res.status(503).json({ error: 'Serviço blockchain indisponível. Tente novamente em instantes.' });
        return;
      }
      if (error.message === 'BLOCKCHAIN_TIMEOUT') {
        res.status(504).json({ error: 'Timeout na confirmação blockchain. Tente novamente.' });
        return;
      }
      if (error.message === 'BLOCKCHAIN_ERROR') {
        res.status(502).json({ error: 'Erro na rede blockchain.' });
        return;
      }
      if (error instanceof ValidationError) {
        if (error.message.includes('cnpj')) {
          res.status(400).json({ error: 'CNPJ inválido. Verifique os 14 dígitos e o dígito verificador.' });
          return;
        }
        if (error.message.includes('vencimento')) {
          res.status(400).json({ error: 'Data de vencimento deve ser futura.' });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Registro já existe.' });
        return;
      }

      // Fallback genérico — garante que o servidor NUNCA cai por exception não tratada
      res.status(500).json({
        error: 'Erro interno ao processar o título',
        details: process.env.NODE_ENV !== 'production' ? error?.message : undefined,
      });
    }
  },

  /**
   * GET /api/titulos
   */
  async getTitulos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;

      const status = req.query.status as string;
      const search = req.query.search as string;

      const whereClause: any = {};
      if (status) {
        whereClause.integrity_status = status;
      }
      if (search) {
        whereClause.OR = [
          { credor: { contains: search, mode: 'insensitive' } },
          { cnpj_emissor: { contains: search } }
        ];
      }

      const titulos = await prisma.tituloDivida.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const totalItems = await prisma.tituloDivida.count({ where: whereClause });

      res.status(200).json({
        data: titulos.map(t => ({
          ...t,
          valor_centavos: t.valor_centavos.toString() // Safe JSON serialization for BigInt
        })),
        meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) }
      });
    } catch (error) {
      console.error('Error fetching titulos:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },

  /**
   * GET /api/titulos/:id
   */
  async getTituloById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const titulo = await prisma.tituloDivida.findUnique({
        where: { id: id as string },
        include: { installments: true }
      }) as any;

      if (!titulo) {
        res.status(404).json({ error: 'Título não encontrado' });
        return;
      }

      // Regra: Ocultar dados privados de installments se for OPERATOR
      let installments = titulo.installments;
      if (req.user?.role === 'OPERATOR') {
        installments = installments.map((inst: any) => {
          const { motivo, autorizado_por, ...rest } = inst;
          return rest as any; // Cast necessário pois o tipo retornado não bate com array original completo
        });
      }

      res.status(200).json({
        ...titulo,
        valor_centavos: titulo.valor_centavos.toString(),
        installments: installments.map((inst: any) => {
          // Extrai todos os campos manualmente para evitar prototype properties do Prisma que quebram JSON.stringify
          const safeInst = { ...inst };
          if (safeInst.valor_centavos !== undefined && safeInst.valor_centavos !== null) {
            safeInst.valor_centavos = safeInst.valor_centavos.toString();
          }
          if (safeInst.createdAt) safeInst.createdAt = safeInst.createdAt.toISOString();
          if (safeInst.updatedAt) safeInst.updatedAt = safeInst.updatedAt.toISOString();
          if (safeInst.data_vencimento_parcela) safeInst.data_vencimento_parcela = safeInst.data_vencimento_parcela.toISOString();
          if (safeInst.data_hora_pagamento) safeInst.data_hora_pagamento = safeInst.data_hora_pagamento.toISOString();
          
          return safeInst;
        })
      });
    } catch (error) {
      console.error('Error fetching titulo by id:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },

  /**
   * GET /api/titulos/:id/verify
   * Endpoint PÚBLICO para validação de integridade criptográfica.
   * Não requer autenticação. Não vaza dados privados.
   */
  async verifyAutenticidade(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      const titulo = await prisma.tituloDivida.findUnique({
        where: { id: id as string },
        include: { installments: true }
      }) as any;

      if (!titulo) {
        // Tenta buscar na blockchain (Comprova se foi REMOVED do banco)
        const onChainHash = await getHashFromChain(id);
        if (onChainHash) {
          res.status(200).json({ status: 'REMOVED', message: 'Registro foi removido do banco de dados, mas lastro original encontrado na blockchain.' });
          return;
        }
        res.status(404).json({ error: 'Título de Dívida não encontrado' });
        return;
      }

      // Aciona motor de auditoria local vs blockchain
      const verifyResult = await verifyTituloIntegrity(titulo);

      // Atualiza o banco se o status de integridade mudou
      if (titulo.integrity_status !== verifyResult.status) {
        await prisma.tituloDivida.update({
          where: { id: id as string },
          data: { integrity_status: verifyResult.status as any }
        });
      }

      // Dados públicos sanitizados rigorosamente
      const publicData = {
        id: titulo.id,
        credor: titulo.credor,
        valor_reais: (Number(titulo.valor_centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        data_vencimento: titulo.data_vencimento.toISOString(),
        emitido_em: titulo.createdAt.toISOString(),
        status: verifyResult.status,
        hash_integridade: verifyResult.sqlHash,
        blockchain_hash: verifyResult.blockchainHash,
        tx_hash: titulo.tx_hash,
        etherscan_url: `https://sepolia.etherscan.io/tx/${titulo.tx_hash}`,
        verificado_em: verifyResult.checkedAt.toISOString(),
        total_parcelas: titulo.installments.length,
        parcelas_pagas: titulo.installments.filter((i: any) => i.status_parcela === 'PAGO').length,
        parcelas_vencidas: titulo.installments.filter((i: any) => i.status_parcela === 'VENCIDO').length,
      };

      res.status(200).json(publicData);
    } catch (error) {
      console.error('Error in verifyAutenticidade:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },

  /**
   * POST /api/titulos/:id/verify-now
   * Dispara verificação de integridade sob demanda para um título individual.
   * Atualiza o status no banco e registra o AuditLog.
   * Requer autenticação (AUDITOR ou ADMIN).
   */
  async verifyNow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      const titulo = await prisma.tituloDivida.findUnique({
        where: { id },
      });

      if (!titulo) {
        res.status(404).json({ error: 'Título não encontrado' });
        return;
      }

      // Disparar a verificação criptográfica
      const result = await verifyTituloIntegrity(titulo);

      // Atualizar status no banco se mudou
      if (titulo.integrity_status !== result.status) {
        await prisma.$transaction(async (tx) => {
          await tx.tituloDivida.update({
            where: { id },
            data: { integrity_status: result.status as any },
          });
          await tx.auditLog.create({
            data: {
              tituloDividaId: id,
              userId: req.user?.id || null,
              action: 'VERIFICATION_REQUESTED',
              clientIp: extractClientIp(req),
              diff_snapshot: {
                summary: `Verificação manual acionada pelo usuário. Status: ${titulo.integrity_status} → ${result.status}`,
                triggeredBy: req.user?.email || 'unknown',
              },
            },
          });
        });
      } else {
        // Mesmo sem mudança, registrar que a verificação foi solicitada
        await prisma.auditLog.create({
          data: {
            tituloDividaId: id,
            userId: req.user?.id || null,
            action: 'VERIFICATION_REQUESTED',
            clientIp: extractClientIp(req),
            diff_snapshot: {
              summary: `Verificação manual acionada. Status confirmado: ${result.status}`,
              triggeredBy: req.user?.email || 'unknown',
            },
          },
        });
      }

      res.status(200).json({
        status: result.status,
        sqlHash: result.sqlHash,
        blockchainHash: result.blockchainHash,
        isMatch: result.isMatch,
        checkedAt: result.checkedAt.toISOString(),
        previousStatus: titulo.integrity_status,
      });
    } catch (error) {
      console.error('Error in verifyNow:', error);
      res.status(500).json({ error: 'Erro interno ao verificar integridade' });
    }
  },
};
