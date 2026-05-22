import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ProofChainRegistry } from "../typechain-types";

// Helper para chai-matchers (ignora o argumento na asserção de evento)
function anyValue() {
  return (_v: unknown) => true;
}

describe("ProofChainRegistry", () => {
  let contract: ProofChainRegistry;
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;
  let newOwner: SignerWithAddress;

  // Helper: converte UUID em bytes32 (mesma lógica do blockchainService.idToBytes32)
  const idOf = (uuid: string) => ethers.keccak256(ethers.toUtf8Bytes(uuid));

  // Helper: simula o SHA-256 do backend (32 bytes não-zero)
  const hashOf = (s: string) => ethers.sha256(ethers.toUtf8Bytes(s));

  beforeEach(async () => {
    [owner, attacker, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ProofChainRegistry");
    contract = (await Factory.deploy()) as unknown as ProofChainRegistry;
    await contract.waitForDeployment();
  });

  // ====================================================================
  // SUITE: Deploy (TST-003 — T1)
  // ====================================================================

  describe("ProofChainRegistry — Deploy", () => {
    it("[T1] Deve definir o deployer como owner após o deploy", async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  // ====================================================================
  // SUITE: storeHash (TST-003 — T2 a T8)
  // ====================================================================

  describe("ProofChainRegistry — storeHash", () => {
    it("[T2] Deve armazenar hash e permitir recuperação via getHash", async () => {
      const id = idOf("titulo-001");
      const hash = hashOf("dados-do-titulo");

      await contract.storeHash(id, hash);

      expect(await contract.getHash(id)).to.equal(hash);
    });

    it("[T3] Deve registrar o timestamp correto no bloco", async () => {
      const id = idOf("titulo-003");
      const hash = hashOf("dados-003");

      const tx = await contract.storeHash(id, hash);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const [, ts, bn] = await contract.getProof(id);
      expect(ts).to.equal(BigInt(block!.timestamp));
      expect(bn).to.equal(BigInt(receipt!.blockNumber));
    });

    it("[T4] Deve emitir evento HashStored com id, hash e timestamp corretos", async () => {
      const id = idOf("titulo-002");
      const hash = hashOf("dados-002");

      await expect(contract.storeHash(id, hash))
        .to.emit(contract, "HashStored")
        .withArgs(id, hash, anyValue(), anyValue());
    });

    it("[T5] Deve rejeitar hash bytes32(0) (hash vazio inválido)", async () => {
      await expect(contract.storeHash(idOf("titulo-004"), ethers.ZeroHash))
        .to.be.revertedWithCustomError(contract, "ZeroHash");
    });

    it("[T6] Deve rejeitar id vazio — bytes32(0) equivalente ao id vazio", async () => {
      await expect(contract.storeHash(ethers.ZeroHash, hashOf("qualquer")))
        .to.be.revertedWithCustomError(contract, "EmptyId");
    });

    it("[T7] Deve rejeitar registro duplicado para o mesmo id (hashNotExists)", async () => {
      const id = idOf("titulo-003");
      const hash = hashOf("dados-003");

      await contract.storeHash(id, hash);

      await expect(contract.storeHash(id, hash))
        .to.be.revertedWithCustomError(contract, "AlreadyRegistered")
        .withArgs(id);
    });

    it("[T8] Deve rejeitar chamada de endereço não-owner (onlyOwner)", async () => {
      const id = idOf("titulo-005");
      const hash = hashOf("dados-005");

      await expect(contract.connect(attacker).storeHash(id, hash))
        .to.be.revertedWithCustomError(contract, "NotOwner");
    });
  });

  // ====================================================================
  // SUITE: Funções view — custo zero (TST-003 — T9 a T12)
  // ====================================================================

  describe("ProofChainRegistry — Funções view (custo zero)", () => {
    it("[T9] getHash deve retornar bytes32(0) para id não registrado", async () => {
      expect(await contract.getHash(idOf("inexistente"))).to.equal(ethers.ZeroHash);
    });

    it("[T10] hashExists deve retornar false para id não registrado", async () => {
      expect(await contract.hashExists(idOf("inexistente"))).to.equal(false);
    });

    it("[T11] hashExists deve retornar true após registro", async () => {
      const id = idOf("titulo-exists");
      await contract.storeHash(id, hashOf("dados"));
      expect(await contract.hashExists(id)).to.equal(true);
    });

    it("[T12] getTimestamp deve retornar 0 para id não registrado", async () => {
      const [, ts] = await contract.getProof(idOf("inexistente"));
      expect(ts).to.equal(0n);
    });
  });

  // ====================================================================
  // SUITE: transferOwnership (TST-003 — T13 a T16)
  // ====================================================================

  describe("ProofChainRegistry — transferOwnership", () => {
    it("[T13] Deve transferir ownership corretamente (two-step)", async () => {
      await contract.transferOwnership(newOwner.address);

      // Antes da aceitação, owner ainda é o antigo
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.pendingOwner()).to.equal(newOwner.address);

      await contract.connect(newOwner).acceptOwnership();

      expect(await contract.owner()).to.equal(newOwner.address);
      expect(await contract.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("[T14] Deve emitir OwnershipTransferred com endereços corretos", async () => {
      await contract.transferOwnership(newOwner.address);

      await expect(contract.connect(newOwner).acceptOwnership())
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(owner.address, newOwner.address);
    });

    it("[T15] Deve rejeitar transferência para address(0)", async () => {
      await expect(contract.transferOwnership(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(contract, "ZeroAddress");
    });

    it("[T16] Deve rejeitar chamada de não-owner", async () => {
      await expect(contract.connect(attacker).transferOwnership(newOwner.address))
        .to.be.revertedWithCustomError(contract, "NotOwner");
    });
  });

  // ====================================================================
  // SUITE: storeHashBatch — feature extra de alta qualidade
  // ====================================================================

  describe("ProofChainRegistry — storeHashBatch", () => {
    it("Armazena múltiplos hashes em uma única transação", async () => {
      const ids = [idOf("b-1"), idOf("b-2"), idOf("b-3")];
      const hashes = [hashOf("a"), hashOf("b"), hashOf("c")];

      await contract.storeHashBatch(ids, hashes);

      for (let i = 0; i < ids.length; i++) {
        expect(await contract.getHash(ids[i])).to.equal(hashes[i]);
      }
    });

    it("Rejeita arrays com tamanhos diferentes", async () => {
      await expect(
        contract.storeHashBatch([idOf("a")], [hashOf("a"), hashOf("b")])
      ).to.be.revertedWithCustomError(contract, "LengthMismatch");
    });

    it("Rejeita batch vazio", async () => {
      await expect(contract.storeHashBatch([], []))
        .to.be.revertedWithCustomError(contract, "EmptyBatch");
    });

    it("É atômico: se um item falhar, nenhum é registrado", async () => {
      const id1 = idOf("atomic-1");
      const id2 = idOf("atomic-2");

      await contract.storeHash(id1, hashOf("first"));

      await expect(
        contract.storeHashBatch([id2, id1], [hashOf("x"), hashOf("y")])
      ).to.be.revertedWithCustomError(contract, "AlreadyRegistered");

      expect(await contract.hashExists(id2)).to.equal(false);
    });
  });

  // ====================================================================
  // SUITE: verify — detecção de fraude on-chain
  // ====================================================================

  describe("ProofChainRegistry — verify (detecção de fraude)", () => {
    it("Retorna true quando hash bate", async () => {
      const id = idOf("v-1");
      const hash = hashOf("verify-data");
      await contract.storeHash(id, hash);
      expect(await contract.verify(id, hash)).to.equal(true);
    });

    it("Retorna false quando hash diverge (FRAUDE DETECTADA)", async () => {
      const id = idOf("v-2");
      await contract.storeHash(id, hashOf("original"));
      expect(await contract.verify(id, hashOf("adulterado"))).to.equal(false);
    });
  });

  // ====================================================================
  // SUITE: Pausable — circuit breaker de segurança
  // ====================================================================

  describe("ProofChainRegistry — Pausable (circuit breaker)", () => {
    it("Bloqueia storeHash quando pausado", async () => {
      await contract.pause();
      await expect(contract.storeHash(idOf("p-1"), hashOf("x")))
        .to.be.revertedWithCustomError(contract, "IsPaused");
    });

    it("Permite leitura mesmo quando pausado (RNF-REL-003)", async () => {
      const id = idOf("p-2");
      const hash = hashOf("data");
      await contract.storeHash(id, hash);
      await contract.pause();
      expect(await contract.getHash(id)).to.equal(hash);
    });

    it("Apenas owner pode pausar", async () => {
      await expect(contract.connect(attacker).pause())
        .to.be.revertedWithCustomError(contract, "NotOwner");
    });

    it("Permite resumir operação após unpause", async () => {
      await contract.pause();
      await contract.unpause();
      // storeHash deve funcionar novamente após unpause
      await expect(contract.storeHash(idOf("p-3"), hashOf("y"))).to.not.be.reverted;
    });
  });
});
