import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Shield, Clock, Hash, Blocks, Loader2 } from "lucide-react";

interface ModalProvaBlockchainProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: {
    uuid: string;
    dbHash: string;
    txHash?: string | null;
    status: string;
  } | null;
  verificationData?: {
    sqlHash: string;
    blockchainHash: string | null;
    isMatch: boolean;
    checkedAt: string;
  } | null;
  isLoading?: boolean;
}

export function ModalProvaBlockchain({
  open,
  onOpenChange,
  titulo,
  verificationData,
  isLoading,
}: ModalProvaBlockchainProps) {
  if (!titulo) return null;

  const hasTx = titulo.txHash && titulo.txHash !== "0x..." && !titulo.txHash.startsWith("0x000");
  const etherscanUrl = hasTx ? `https://sepolia.etherscan.io/tx/${titulo.txHash}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Prova Criptográfica On-Chain
          </DialogTitle>
          <DialogDescription>
            Dados extraídos diretamente do contrato inteligente na rede Ethereum Sepolia.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm">Consultando blockchain...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Status de integridade */}
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              {verificationData?.isMatch ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  ✓ Íntegro
                </Badge>
              ) : titulo.status === "PENDING" ? (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  ⏳ Pendente
                </Badge>
              ) : (
                <Badge className="bg-red-50 text-red-700 border-red-200">
                  ⚠ Divergência
                </Badge>
              )}
            </div>

            {/* Hash do banco (SHA-256) */}
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hash SHA-256 (Banco de Dados)
                </span>
              </div>
              <p className="font-mono text-xs text-foreground break-all select-all">
                {verificationData?.sqlHash || titulo.dbHash || "N/A"}
              </p>
            </div>

            {/* Hash da blockchain */}
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Blocks className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hash On-Chain (Blockchain Sepolia)
                </span>
              </div>
              <p className="font-mono text-xs text-foreground break-all select-all">
                {verificationData?.blockchainHash || "Não disponível (modo bypass ou não ancorado)"}
              </p>
            </div>

            {/* TX Hash */}
            {hasTx && (
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Transaction Hash
                  </span>
                </div>
                <p className="font-mono text-xs text-foreground break-all select-all">
                  {titulo.txHash}
                </p>
                {etherscanUrl && (
                  <a
                    href={etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  >
                    Ver no Etherscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Timestamp */}
            {verificationData?.checkedAt && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Verificado em: {new Date(verificationData.checkedAt).toLocaleString("pt-BR")}
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
