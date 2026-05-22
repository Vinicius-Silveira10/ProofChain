import { ethers, run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * ============================================================================
 * TASK 02.3 — Deploy do ProofChainRegistry na Rede Sepolia
 * ============================================================================
 *
 * Pré-requisitos no /smart-contract/.env:
 *   SEPOLIA_RPC_URL              — URL do RPC (Infura ou Alchemy)
 *   BACKEND_WALLET_PRIVATE_KEY   — Chave privada da wallet do backend
 *   ETHERSCAN_API_KEY            — Para verificação automática (opcional)
 *
 * Uso:
 *   npm run deploy
 *   — ou —
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *
 * Após o deploy:
 *   Copie o CONTRACT_ADDRESS exibido no console para o /backend/.env.
 * ============================================================================
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Saldo mínimo recomendado pela spec antes de iniciar o deploy. */
const MIN_BALANCE_ETH = 0.05;

/**
 * Confirmações de bloco a aguardar antes de salvar o artefato de deploy.
 * Garante que o estado on-chain está estável (spec TASK 02.3, item 5).
 */
const DEPLOY_CONFIRMATIONS = 5;

/**
 * Confirmações adicionais para que o Etherscan indexe o bytecode.
 * Incremental sobre DEPLOY_CONFIRMATIONS — não duplica a espera.
 */
const ETHERSCAN_EXTRA_CONFIRMATIONS = 1;

/** Diretório de artefatos de deploy — relativo à raiz do projeto (process.cwd()). */
const DEPLOYMENTS_DIR = path.resolve(process.cwd(), "deployments");

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isLocalNetwork = network.name === "hardhat" || network.name === "localhost";

  printBanner(network.name);

  // ─── PASSO 1 & 2: Conectar à rede e identificar wallet ───────────────────
  const [deployer] = await ethers.getSigners();
  const rawBalance = await ethers.provider.getBalance(deployer.address);
  const balanceEth = parseFloat(ethers.formatEther(rawBalance));

  console.log(`  📍 Deployer  : ${deployer.address}`);
  console.log(`  💰 Balance   : ${balanceEth.toFixed(6)} ETH\n`);

  // ─── PASSO 3: Verificar saldo mínimo ─────────────────────────────────────
  if (balanceEth < MIN_BALANCE_ETH) {
    throw new Error(
      [
        `Saldo insuficiente para deploy:`,
        `  Atual   : ${balanceEth.toFixed(6)} ETH`,
        `  Mínimo  : ${MIN_BALANCE_ETH} ETH`,
        `  Faucet  : https://sepoliafaucet.com`,
      ].join("\n")
    );
  }

  console.log(`  ✅ Saldo verificado (>= ${MIN_BALANCE_ETH} ETH)\n`);

  // ─── PASSO 4: Deploy ──────────────────────────────────────────────────────
  console.log("  ⏳ Deployando ProofChainRegistry...\n");

  const Factory = await ethers.getContractFactory("ProofChainRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  if (!deployTx) {
    throw new Error("deploymentTransaction() retornou null — deploy pode ter falhado silenciosamente.");
  }

  const txHash = deployTx.hash;

  // ─── PASSO 5: Aguardar 5 confirmações de bloco ───────────────────────────
  if (!isLocalNetwork) {
    process.stdout.write(`  ⏳ Aguardando ${DEPLOY_CONFIRMATIONS} confirmações de bloco`);

    // Escuta evento de bloco para dar feedback visual ao operador
    let confirmed = 0;
    const receipt = await new Promise<Awaited<ReturnType<typeof deployTx.wait>>>((resolve, reject) => {
      deployTx.wait(DEPLOY_CONFIRMATIONS).then(resolve).catch(reject);
      const interval = setInterval(() => {
        confirmed++;
        process.stdout.write(".");
        if (confirmed >= DEPLOY_CONFIRMATIONS) clearInterval(interval);
      }, 12_000); // ~12s por bloco na Sepolia
    });

    console.log(` ✅\n`);

    if (!receipt || receipt.status !== 1) {
      throw new Error(`Transação de deploy revertida. TxHash: ${txHash}`);
    }
  }

  // ─── PASSO 6: Exibir informações no console ───────────────────────────────
  const etherscanBase = "https://sepolia.etherscan.io";
  const etherscanAddr = `${etherscanBase}/address/${contractAddress}`;
  const etherscanTx   = `${etherscanBase}/tx/${txHash}`;

  console.log("  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║              📋  DEPLOYMENT SUMMARY                      ║");
  console.log("  ╠══════════════════════════════════════════════════════════╣");
  console.log(`  ║  Contract : ${contractAddress}`);
  console.log(`  ║  Tx Hash  : ${txHash}`);
  console.log(`  ║  Explorer : ${etherscanAddr}`);
  console.log(`  ║  Tx Link  : ${etherscanTx}`);
  console.log("  ╚══════════════════════════════════════════════════════════╝\n");

  console.log("  ⚠️  Adicione ao /backend/.env:");
  console.log(`     CONTRACT_ADDRESS=${contractAddress}\n`);

  // ─── PASSO 7: Salvar artefato de deploy em deployments/sepolia.json ───────
  saveArtifact({
    contractAddress,
    txHash,
    deployedAt: new Date().toISOString(),
    network: network.name,
    deployer: deployer.address,
    etherscan: etherscanAddr,
  });

  // ─── PASSO 8: Verificar contrato no Etherscan (recomendado) ──────────────
  if (!isLocalNetwork) {
    const totalConfirmations = DEPLOY_CONFIRMATIONS + ETHERSCAN_EXTRA_CONFIRMATIONS;
    console.log(`  ⏳ Aguardando +${ETHERSCAN_EXTRA_CONFIRMATIONS} confirmação adicional para indexação no Etherscan...`);
    await deployTx.wait(totalConfirmations);

    try {
      await run("verify:verify", { address: contractAddress, constructorArguments: [] });
      console.log("  ✅ Contrato verificado no Etherscan Sepolia!\n");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already verified")) {
        console.log("  ℹ️  Contrato já estava verificado no Etherscan.\n");
      } else {
        console.warn("  ⚠️  Verificação no Etherscan falhou — faça manualmente:");
        console.warn(`     npx hardhat verify --network sepolia ${contractAddress}\n`);
      }
    }
  }

  console.log("  🎉 Deploy concluído com sucesso!\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface DeployArtifact {
  contractAddress: string;
  txHash: string;
  deployedAt: string;
  network: string;
  deployer: string;
  etherscan: string;
}

function saveArtifact(artifact: DeployArtifact): void {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  const filePath = path.join(DEPLOYMENTS_DIR, `${artifact.network}.json`);
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2), "utf-8");

  console.log(`  ✅ Artefato salvo em: deployments/${artifact.network}.json\n`);
}

function printBanner(networkName: string): void {
  console.log("\n  ╔══════════════════════════════════════════════════════════╗");
  console.log("  ║        🚀  ProofChainRegistry — Deploy Script             ║");
  console.log(`  ║        📡  Network: ${networkName.padEnd(37)}║`);
  console.log("  ╚══════════════════════════════════════════════════════════╝\n");
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`\n  ❌ Deploy abortado:\n     ${msg}\n`);
  process.exitCode = 1;
});
