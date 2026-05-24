import { Info, ExternalLink, Database, Blocks, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForensicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dbHash: string;
  blockchainHash: string;
  blockTimestamp: string;
  txHash: string;
}

export function ForensicModal({
  open,
  onOpenChange,
  dbHash,
  blockchainHash,
  blockTimestamp,
  txHash,
}: ForensicModalProps) {
  const hashesMatch = dbHash === blockchainHash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Blocks className="size-5" />
            Trilha Forense — Comparação de Integridade
          </DialogTitle>
          <DialogDescription>
            Comparação entre os dados armazenados no PostgreSQL e a prova criptográfica registrada na blockchain Sepolia.
          </DialogDescription>
        </DialogHeader>

        {/* Hash Mismatch Alert */}
        {!hashesMatch && (
          <div className="flex items-center gap-3 rounded-md bg-red-50 px-4 py-3 border border-red-200">
            <XCircle className="size-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">
              <span className="font-semibold">Inconsistência detectada:</span> Os hashes não correspondem, indicando adulteração de dados.
            </p>
          </div>
        )}

        {/* Side by Side Comparison */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* PostgreSQL Column */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="size-4 text-muted-foreground" />
              Dados no PostgreSQL
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hash SHA-256
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Assinatura matemática única do registro gerada a partir dos dados do título.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-1.5 rounded bg-muted p-2">
                  <code className="break-all text-xs font-mono text-foreground">
                    {dbHash}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Column */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Blocks className="size-4 text-muted-foreground" />
              Prova na Blockchain Sepolia
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hash no Smart Contract
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Prova imutável registrada na blockchain Ethereum (rede de testes Sepolia).
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-1.5 rounded bg-muted p-2">
                  <code className="break-all text-xs font-mono text-foreground">
                    {blockchainHash}
                  </code>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Timestamp do Bloco
                </p>
                <p className="mt-1.5 text-sm text-foreground">
                  {blockTimestamp}
                </p>
              </div>
            </div>

            {/* Etherscan Link */}
            <div className="mt-4 border-t border-border pt-4">
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
              >
                Ver transação no Etherscan
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
