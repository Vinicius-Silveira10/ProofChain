import { describe, it, expect } from "@jest/globals";
import {
  generateHash,
  hashToBytes32,
  constantTimeCompare,
  HASH_VERSION,
  type TituloDividaHashInput,
} from "../../src/services/hashEngine";

const base: TituloDividaHashInput = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  cnpj_emissor: "12345678000195",
  valor_centavos: 5_000_000n, // R$ 50.000,00
  data_vencimento: new Date("2025-12-31T00:00:00.000Z"),
};

describe("HashEngine (TST-001)", () => {
  describe("determinismo", () => {
    it("gera hash idêntico para inputs idênticos", () => {
      expect(generateHash(base)).toBe(generateHash(base));
    });

    it("retorna string hex lowercase de 64 caracteres", () => {
      const h = generateHash(base);
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    });

    it("não muda quando valor_centavos é passado como number ou bigint", () => {
      const h1 = generateHash({ ...base, valor_centavos: 5_000_000 });
      const h2 = generateHash({ ...base, valor_centavos: 5_000_000n });
      expect(h1).toBe(h2);
    });

    it("HASH_VERSION é exportado e é igual a 1", () => {
      expect(HASH_VERSION).toBe(1);
    });
  });

  describe("sensibilidade (TST-002: detecção de adulteração)", () => {
    it("muda quando valor_centavos é alterado", () => {
      const h1 = generateHash(base);
      const h2 = generateHash({ ...base, valor_centavos: 500_000n });
      expect(h1).not.toBe(h2);
    });

    it("muda quando cnpj_emissor é alterado", () => {
      const h1 = generateHash(base);
      const h2 = generateHash({ ...base, cnpj_emissor: "99999999000100" });
      expect(h1).not.toBe(h2);
    });

    it("muda quando id é alterado", () => {
      const h1 = generateHash(base);
      const h2 = generateHash({ ...base, id: "different-uuid-value-zzz" });
      expect(h1).not.toBe(h2);
    });

    it("muda quando data_vencimento é alterada (mesmo por 1ms)", () => {
      const h1 = generateHash(base);
      const h2 = generateHash({
        ...base,
        data_vencimento: new Date("2025-12-31T00:00:00.001Z"),
      });
      expect(h1).not.toBe(h2);
    });
  });

  describe("validação de entrada (fail-fast)", () => {
    it("rejeita id vazio", () => {
      expect(() => generateHash({ ...base, id: "" })).toThrow(/id/);
    });

    it("rejeita CNPJ com formato inválido", () => {
      expect(() => generateHash({ ...base, cnpj_emissor: "123" })).toThrow(/cnpj/i);
      expect(() => generateHash({ ...base, cnpj_emissor: "12.345.678/0001-95" })).toThrow(/cnpj/i);
    });

    it("rejeita valor_centavos zero ou negativo (RN-REC-001)", () => {
      expect(() => generateHash({ ...base, valor_centavos: 0n })).toThrow(/> 0/);
      expect(() => generateHash({ ...base, valor_centavos: -1n })).toThrow(/> 0/);
    });

    it("rejeita valor_centavos acima do teto regulatório", () => {
      expect(() =>
        generateHash({ ...base, valor_centavos: 100_000_000_000_000n })
      ).toThrow(/maximum/);
    });

    it("rejeita data_vencimento inválida", () => {
      expect(() =>
        generateHash({ ...base, data_vencimento: new Date("invalid") })
      ).toThrow(/data_vencimento/);
    });
  });

  describe("hashToBytes32", () => {
    it("adiciona o prefixo 0x ao hex de 64 chars", () => {
      const h = generateHash(base);
      expect(hashToBytes32(h)).toBe(`0x${h}`);
    });

    it("rejeita hash com formato inválido", () => {
      expect(() => hashToBytes32("not-a-hash")).toThrow();
      expect(() => hashToBytes32("ABC123")).toThrow();
    });
  });

  describe("constantTimeCompare", () => {
    it("retorna true para strings iguais", () => {
      expect(constantTimeCompare("abc", "abc")).toBe(true);
    });

    it("retorna false para strings diferentes", () => {
      expect(constantTimeCompare("abc", "abd")).toBe(false);
    });

    it("retorna false para strings de tamanhos diferentes", () => {
      expect(constantTimeCompare("abc", "abcd")).toBe(false);
    });
  });

  describe("regressão: snapshot do hash", () => {
    /**
     * ⚠️  ÂNCORA DE REGRESSÃO — NÃO ALTERAR ESTE VALOR.
     * Se este teste falhar, o algoritmo foi modificado e TODOS os hashes
     * históricos na blockchain estão invalidados.
     *
     * Payload canônico:
     *   id           : "550e8400-e29b-41d4-a716-446655440000"
     *   cnpj_emissor : "12345678000195"
     *   valor_str    : "5000000"
     *   data_iso     : "2025-12-31T00:00:00.000Z"
     *   raw          : "550e8400-e29b-41d4-a716-44665544000012345678000195" +
     *                  "50000002025-12-31T00:00:00.000Z"
     */
    it("hash do payload canônico permanece estável (âncora SHA-256)", () => {
      const CANONICAL_HASH =
        "e00a891d99e393f68844f7b548b36f4a7d238d44ae3a25613eb598895914d5e7";
      expect(generateHash(base)).toBe(CANONICAL_HASH);
    });
  });

  describe("cobertura de branches defensivos", () => {
    it("rejeita input null (guarda de tipo)", () => {
      // Cobre linha 93 — branch: input não é objeto
      expect(() => generateHash(null as any)).toThrow(/input must be an object/);
    });

    it("rejeita valor_centavos com tipo inválido (ex: string)", () => {
      // Cobre linha 105 — branch: tipo diferente de bigint/number
      expect(() =>
        generateHash({ ...base, valor_centavos: "5000000" as any })
      ).toThrow(/bigint or number/);
    });
  });
});
