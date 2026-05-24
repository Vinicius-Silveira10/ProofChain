import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ModalPagamentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  valor: string
  numeroParcela: string
  onConfirmar: () => void
}

export function ModalPagamento({
  open,
  onOpenChange,
  valor,
  numeroParcela,
  onConfirmar,
}: ModalPagamentoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-warning/15">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <DialogTitle className="text-lg">Confirmar Pagamento</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Confirmar pagamento de{" "}
            <span className="font-semibold text-foreground">{valor}</span>{" "}
            referente à parcela {numeroParcela}?
          </DialogDescription>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            O timestamp de auditoria será gerado automaticamente pelo servidor.{" "}
            <span className="text-alert font-medium">Esta ação não pode ser desfeita.</span>
          </p>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
