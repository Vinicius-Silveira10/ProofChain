-- Migration: add_indexes
-- Adiciona índices de performance em colunas de alta frequência de acesso.
-- Gerado como migration manual pois o schema.prisma já foi atualizado com @@index.

-- titulos_divida: filtro por emissor (relatórios por CNPJ)
CREATE INDEX IF NOT EXISTS "titulos_divida_cnpj_emissor_idx"
  ON "titulos_divida"("cnpj_emissor");

-- titulos_divida: filtro por status (listagem de títulos ativos)
CREATE INDEX IF NOT EXISTS "titulos_divida_status_idx"
  ON "titulos_divida"("status");

-- titulos_divida: filtro por integrity_status (varredura do cron job RN-INV-001)
-- Este índice é crítico: o cron percorre todos os títulos com status PENDING/COMPROMISED
CREATE INDEX IF NOT EXISTS "titulos_divida_integrity_status_idx"
  ON "titulos_divida"("integrity_status");

-- installments: listagem de parcelas por título
CREATE INDEX IF NOT EXISTS "installments_tituloDividaId_idx"
  ON "installments"("tituloDividaId");

-- audit_logs: listagem de logs por título, ordenado por data (mais recente primeiro)
CREATE INDEX IF NOT EXISTS "audit_logs_tituloDividaId_timestamp_idx"
  ON "audit_logs"("tituloDividaId", "timestamp" DESC);
