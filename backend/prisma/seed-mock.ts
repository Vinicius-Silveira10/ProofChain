import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Populando Títulos de Dívida e Parcelas...");
  
  // Buscar um operador e um auditor para assinar as parcelas
  const operator = await prisma.user.findFirst({ where: { role: 'OPERATOR' } });
  
  if (!operator) {
    throw new Error("Nenhum usuário OPERATOR encontrado. Rode o seed principal primeiro.");
  }

  // Limpar tabelas caso já exista
  await prisma.auditLog.deleteMany({});
  await prisma.installment.deleteMany({});
  await prisma.tituloDivida.deleteMany({});

  // Título 1: Ativo e em andamento
  const t1 = await prisma.tituloDivida.create({
    data: {
      cnpj_emissor: "12345678000199",
      credor: "Empresa XPTO Ltda",
      valor_centavos: 15000000, // R$ 150.000,00
      data_vencimento: new Date(new Date().setMonth(new Date().getMonth() + 6)), // 6 meses
      hash_integridade: crypto.randomBytes(32).toString('hex'),
      tx_hash: "0x" + crypto.randomBytes(32).toString('hex'),
      status: "ACTIVE",
      integrity_status: "VERIFIED",
      installments: {
        create: [
          {
            numero_parcela: 1,
            valor_centavos: 5000000,
            data_vencimento_parcela: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            motivo: "Primeira parcela da emissão primária",
            autorizado_por: "Diretoria Financeira",
            status_parcela: "PAGO",
            data_hora_pagamento: new Date(),
            usuario_pagamento_id: operator.id
          },
          {
            numero_parcela: 2,
            valor_centavos: 5000000,
            data_vencimento_parcela: new Date(new Date().setMonth(new Date().getMonth() + 2)),
            motivo: "Segunda parcela da emissão primária",
            autorizado_por: "Diretoria Financeira",
            status_parcela: "PENDENTE"
          },
          {
            numero_parcela: 3,
            valor_centavos: 5000000,
            data_vencimento_parcela: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            motivo: "Terceira parcela da emissão primária",
            autorizado_por: "Diretoria Financeira",
            status_parcela: "PENDENTE"
          }
        ]
      }
    }
  });

  // Título 2: Vencido / Atrasado
  const t2 = await prisma.tituloDivida.create({
    data: {
      cnpj_emissor: "98765432000111",
      credor: "Indústria Global S.A.",
      valor_centavos: 5000000, // R$ 50.000,00
      data_vencimento: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Venceu mês passado
      hash_integridade: crypto.randomBytes(32).toString('hex'),
      tx_hash: "0x" + crypto.randomBytes(32).toString('hex'),
      status: "ACTIVE",
      integrity_status: "PENDING",
      installments: {
        create: [
          {
            numero_parcela: 1,
            valor_centavos: 5000000,
            data_vencimento_parcela: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            motivo: "Pagamento único",
            autorizado_por: "Conselho de Administração",
            status_parcela: "VENCIDO"
          }
        ]
      }
    }
  });

  // Título 3: Fraude detectada (COMPROMISED)
  const t3 = await prisma.tituloDivida.create({
    data: {
      cnpj_emissor: "11222333000144",
      credor: "Tech Startups Fund",
      valor_centavos: 85000000, // R$ 850.000,00
      data_vencimento: new Date(new Date().setMonth(new Date().getMonth() + 12)), 
      hash_integridade: crypto.randomBytes(32).toString('hex'),
      tx_hash: "0x" + crypto.randomBytes(32).toString('hex'),
      status: "ACTIVE",
      integrity_status: "COMPROMISED",
      installments: {
        create: [
          {
            numero_parcela: 1,
            valor_centavos: 85000000,
            data_vencimento_parcela: new Date(new Date().setMonth(new Date().getMonth() + 12)),
            motivo: "Aporte integral via ProofChain",
            autorizado_por: "Comitê de Risco",
            status_parcela: "PENDENTE"
          }
        ]
      }
    }
  });

  // Registrar Logs de Auditoria Fictícios
  await prisma.auditLog.createMany({
    data: [
      {
        tituloDividaId: t1.id,
        userId: operator.id,
        action: "INSERT",
        clientIp: "127.0.0.1",
        timestamp: new Date(new Date().setDate(new Date().getDate() - 5))
      },
      {
        tituloDividaId: t2.id,
        userId: operator.id,
        action: "INSERT",
        clientIp: "127.0.0.1",
        timestamp: new Date(new Date().setDate(new Date().getDate() - 40))
      },
      {
        tituloDividaId: t3.id,
        userId: operator.id,
        action: "INTEGRITY_BREACH_DETECTED",
        clientIp: "127.0.0.1",
        timestamp: new Date()
      }
    ]
  });

  console.log("✅ 3 Títulos, 5 Parcelas e Logs gerados com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
