-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OPERATOR', 'AUDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TituloStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'ERROR');

-- CreateEnum
CREATE TYPE "IntegrityStatus" AS ENUM ('VERIFIED', 'COMPROMISED', 'PENDING');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('INSERT', 'UPDATE', 'STATUS_CHANGE', 'INTEGRITY_BREACH_DETECTED', 'CUSTODY_TRANSFER', 'VERIFICATION_REQUESTED', 'PAYMENT_REGISTERED', 'INSTALLMENT_OVERDUE', 'INSTALLMENT_CANCELLED', 'EXPORT_GENERATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulos_divida" (
    "id" TEXT NOT NULL,
    "cnpj_emissor" TEXT NOT NULL,
    "credor" TEXT NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "hash_integridade" TEXT NOT NULL,
    "tx_hash" TEXT,
    "status" "TituloStatus" NOT NULL DEFAULT 'ACTIVE',
    "integrity_status" "IntegrityStatus" NOT NULL DEFAULT 'PENDING',
    "supersedes_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "titulos_divida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "tituloDividaId" TEXT NOT NULL,
    "numero_parcela" INTEGER NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "data_vencimento_parcela" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "autorizado_por" TEXT NOT NULL,
    "status_parcela" "InstallmentStatus" NOT NULL DEFAULT 'PENDENTE',
    "data_hora_pagamento" TIMESTAMP(3),
    "usuario_pagamento_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tituloDividaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "clientIp" TEXT NOT NULL,
    "diff_snapshot" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "titulos_divida_hash_integridade_key" ON "titulos_divida"("hash_integridade");

-- CreateIndex
CREATE UNIQUE INDEX "installments_tituloDividaId_numero_parcela_key" ON "installments"("tituloDividaId", "numero_parcela");

-- AddForeignKey
ALTER TABLE "titulos_divida" ADD CONSTRAINT "titulos_divida_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "titulos_divida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_tituloDividaId_fkey" FOREIGN KEY ("tituloDividaId") REFERENCES "titulos_divida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_usuario_pagamento_id_fkey" FOREIGN KEY ("usuario_pagamento_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tituloDividaId_fkey" FOREIGN KEY ("tituloDividaId") REFERENCES "titulos_divida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
