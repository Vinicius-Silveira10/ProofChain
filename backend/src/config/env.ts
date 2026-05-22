import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SEPOLIA_RPC_URL',
  'BACKEND_WALLET_PRIVATE_KEY',
  'CONTRACT_ADDRESS'
];

export function validateEnv() {
  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    console.error(`❌ CRITICAL ERROR: Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
    process.exit(1); // crash-fast
  }
}

export const env = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL!,
  backendWalletPrivateKey: process.env.BACKEND_WALLET_PRIVATE_KEY!,
  contractAddress: process.env.CONTRACT_ADDRESS!
};
