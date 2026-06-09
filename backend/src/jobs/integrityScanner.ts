import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { verifyBatch } from '../services/verificationService';

export const integrityScanner = {
  /**
   * Inicializa o Oráculo Autônomo.
   * Por padrão: A cada 15 minutos.
   */
  start() {
    console.log('[Oráculo] Integrity scanner scheduled: every 15 minutes');
    
    cron.schedule('*/15 * * * *', async () => {
      console.log(`[Oráculo] Initiating automated sweep at ${new Date().toISOString()}`);
      try {
        await this.runSweep();
        console.log(`[Oráculo] Automated sweep completed successfully.`);
      } catch (error) {
        // Falha no Cron NUNCA deve derrubar a instância Node.
        console.error(`[Oráculo] Erro catastrófico na varredura. Servidor mantido online. Erro:`, error);
      }
    });
  },

  async runSweep() {
    console.log('[Oráculo] Iniciando varredura em lotes paginados (Otimização SRE)...');

    let skip = 0;
    const TAKE_LIMIT = 500; // Limita o consumo de RAM do Node.js
    let hasMoreTitles = true;
    
    let totalVarridos = 0;
    let totalAnomaliasEncontradas = 0;
    let anchorId = null;

    // 1. Pipeline Criptográfico com Paginação
    while (hasMoreTitles) {
      const ativos = await prisma.tituloDivida.findMany({
        where: { status: 'ACTIVE' },
        skip,
        take: TAKE_LIMIT
      });

      if (ativos.length === 0) {
        hasMoreTitles = false;
        break;
      }
      
      if (!anchorId) anchorId = ativos[0].id;

      // O verifyBatch internamente garante que a Infura/Alchemy receba no máx 10 req/s.
      const batchResultMap = await verifyBatch(ativos);

      for (const [id, result] of batchResultMap.entries()) {
        const estadoAtualBanco = ativos.find(a => a.id === id)?.integrity_status;

        if (result.status === 'COMPROMISED' && estadoAtualBanco !== 'COMPROMISED') {
          console.error(`[Oráculo-CRITICAL] Mutações ilegais detectadas no Título ${id}. Assinando fraude no banco.`);
          totalAnomaliasEncontradas++;
          
          // Buscar o suspeito da fraude (último usuário que editou o registro)
          const lastModification = await prisma.auditLog.findFirst({
            where: { 
              tituloDividaId: id, 
              userId: { not: null },
              action: { in: ['UPDATE', 'PAYMENT_REGISTERED', 'STATUS_CHANGE', 'INSERT'] }
            },
            orderBy: { timestamp: 'desc' },
            include: { user: true }
          });

          const suspectInfo = lastModification?.user ? {
            name: lastModification.user.name,
            email: lastModification.user.email
          } : null;
          
          await prisma.$transaction(async (tx) => {
            await tx.tituloDivida.update({
              where: { id },
              data: { integrity_status: 'COMPROMISED' }
            });
            await tx.auditLog.create({
              data: {
                tituloDividaId: id,
                userId: null,  // Log do sistema — sem usuário humano associado
                action: 'INTEGRITY_BREACH_DETECTED',
                clientIp: '127.0.0.1',
                diff_snapshot: { 
                  summary: 'O Oráculo detectou divergências fatais contra a Blockchain de origem.',
                  suspect: suspectInfo
                }
              }
            });
          });
        } 
        else if (result.status === 'VERIFIED' && estadoAtualBanco === 'COMPROMISED') {
          console.log(`[Oráculo] A integridade do Título ${id} foi restaurada.`);
          await prisma.$transaction(async (tx) => {
            await tx.tituloDivida.update({
              where: { id },
              data: { integrity_status: 'VERIFIED' }
            });
            await tx.auditLog.create({
              data: {
                tituloDividaId: id,
                userId: null,  // Log do sistema — sem usuário humano associado
                action: 'STATUS_CHANGE',
                clientIp: '127.0.0.1',
                diff_snapshot: { summary: 'Integridade criptográfica restaurada à perfeição.' }
              }
            });
          });
        }
      }

      totalVarridos += ativos.length;
      skip += TAKE_LIMIT;
    }

    // 2. Pipeline Financeiro: Atualizar Parcelas Vencidas
    const agora = new Date();
    let parcelasProcessadas = 0;
    
    // Para as parcelas, faremos uma mutação em lote segura no Prisma
    const vencidos = await prisma.installment.findMany({
      where: {
        status_parcela: 'PENDENTE',
        data_vencimento_parcela: { lt: agora }
      },
      select: { id: true, tituloDividaId: true, numero_parcela: true }
    });

    for (const parcela of vencidos) {
      await prisma.$transaction(async (tx) => {
        await tx.installment.update({
          where: { id: parcela.id },
          data: { status_parcela: 'VENCIDO' }
        });
        await tx.auditLog.create({
          data: {
            tituloDividaId: parcela.tituloDividaId,
            userId: null,  // Log do sistema — sem usuário humano associado
            action: 'INSTALLMENT_OVERDUE',
            clientIp: '127.0.0.1',
            diff_snapshot: {
              summary: `Parcela ${parcela.numero_parcela} teve seu prazo estourado e foi declarada VENCIDA pelo Oráculo financeiro.`
            }
          }
        });
      });
      parcelasProcessadas++;
    }

    // 3. Selo de Varredura Global (Consumido pelo Dashboard)
    if (anchorId) {
      await prisma.auditLog.create({
        data: {
          tituloDividaId: anchorId,
          userId: null,  // Log do sistema — sem usuário humano associado
          action: 'VERIFICATION_REQUESTED',
          clientIp: '127.0.0.1',
          diff_snapshot: { 
            summary: `Varredura Global Concluída. ${totalVarridos} Títulos varridos. ${parcelasProcessadas} Boletos reclassificados. ${totalAnomaliasEncontradas} Novas anomalias.` 
          }
        }
      });
    }
  }
};
