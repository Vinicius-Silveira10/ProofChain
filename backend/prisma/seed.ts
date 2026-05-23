/**
 * ProofChain — Database Seed Script (TASK 03.2)
 *
 * Popula o banco com usuários de desenvolvimento.
 * Execução: npx prisma db seed
 *
 * SEGURANÇA:
 *  - Senhas NUNCA são salvas em texto puro.
 *  - bcrypt com custo 12 (≈ 250ms por hash — resistente a brute force).
 *  - Upsert idempotente: pode rodar múltiplas vezes sem duplicar registros.
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Prisma 7.x: conexão via driver adapter (pg Pool), não mais via URL no construtor.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });



// ---------------------------------------------------------------------------
// Constante de custo do bcrypt — NÃO reduzir abaixo de 12 em produção.
// ---------------------------------------------------------------------------
const BCRYPT_COST = 12;

interface SeedUser {
  email: string;
  plainPassword: string;
  name: string;
  role: UserRole;
}

const SEED_USERS: SeedUser[] = [
  {
    email: "admin@proofchain.dev",
    plainPassword: "Admin@2025!",
    name: "Administrador",
    role: "ADMIN",
  },
  {
    email: "operador@proofchain.dev",
    plainPassword: "Operador@2025!",
    name: "Operador Financeiro",
    role: "OPERATOR",
  },
  {
    email: "auditor@proofchain.dev",
    plainPassword: "Auditor@2025!",
    name: "Auditor Interno",
    role: "AUDITOR",
  },
];

async function main(): Promise<void> {
  console.log("🌱 Iniciando seed do banco de dados ProofChain...\n");

  for (const seedUser of SEED_USERS) {
    // Hash da senha com custo 12 — operação bloqueante intencional no seed
    const passwordHash = await bcrypt.hash(seedUser.plainPassword, BCRYPT_COST);

    // upsert: cria se não existir, atualiza hash da senha se já existir
    // Garante que o seed é idempotente e pode ser re-executado com segurança.
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        passwordHash,
        name: seedUser.name,
        role: seedUser.role,
        isActive: true,
      },
      create: {
        email: seedUser.email,
        passwordHash,
        name: seedUser.name,
        role: seedUser.role,
        isActive: true,
      },
    });

    console.log(`  ✅ Usuário criado/atualizado: [${user.role}] ${user.email}`);
  }

  console.log("\n✅ Seed concluído com sucesso.");
  console.log(
    "   Acesse o Prisma Studio para verificar: npx prisma studio\n"
  );
}

main()
  .catch((error: unknown) => {
    // Crash-fast: erro no seed deve parar o processo com código de saída != 0
    console.error("❌ ERRO FATAL no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
