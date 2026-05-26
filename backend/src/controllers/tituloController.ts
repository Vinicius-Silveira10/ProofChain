import { Request, Response } from 'express';
import { TituloService, ValidationError } from '../services/tituloService';
import { prisma } from '../config/prisma';
import { initProvider, getHashFromChain } from '../services/blockchainService';
import { verifyTituloIntegrity } from '../services/verificationService';
import { AuthRequest } from '../middleware/auth';
import { extractClientIp } from '../middleware/auditLog';

// Instanciar o service (Usa o singleton do prisma e o facade do provider)
const tituloService = new TituloService(prisma, initProvider());

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

      // Evita falha do BigInt construtor
      if (req.body.valor_centavos === undefined || req.body.valor_centavos === null) {
        res.status(400).json({ error: 'valor_centavos é obrigatório' });
        return;
      }

      const input = {
        cnpj_emissor: req.body.cnpj_emissor,
        credor: req.body.credor,
        valor_centavos: BigInt(req.body.valor_centavos),
        data_vencimento: new Date(req.body.data_vencimento),
      };

      const ctx = {
        userId: req.user.id,
        clientIp: extractClientIp(req),
      };

      const titulo = await tituloService.create(input, ctx);

      res.status(201).json(titulo);
    } catch (error: any) {
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
          res.status(400).json({ error: 'CNPJ inválido.' });
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

      console.error('Error in createTitulo:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
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
        installments: installments.map((inst: any) => ({
          ...inst,
          valor_centavos: inst.valor_centavos ? inst.valor_centavos.toString() : undefined
        }))
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
  }
};
